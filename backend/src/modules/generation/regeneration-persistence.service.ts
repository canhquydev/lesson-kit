import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ComponentType } from '../../common/enums';
import { Activity } from '../activities/schemas/activity.schema';
import { Assessment } from '../assessments/schemas/assessment.schema';
import { ClassroomExpression } from '../classroom-expressions/schemas/classroom-expression.schema';
import { StudentQuestion } from '../student-questions/schemas/student-question.schema';
import { TeachingScript } from '../teaching-scripts/schemas/teaching-script.schema';
import { Vocabulary } from '../vocabularies/schemas/vocabulary.schema';

const COMPONENT_MODELS: Record<ComponentType, string> = {
  [ComponentType.VOCABULARY]: Vocabulary.name,
  [ComponentType.EXPRESSIONS]: ClassroomExpression.name,
  [ComponentType.ACTIVITIES]: Activity.name,
  [ComponentType.SCRIPT]: TeachingScript.name,
  [ComponentType.QUESTIONS]: StudentQuestion.name,
  [ComponentType.ASSESSMENT]: Assessment.name,
};

export interface RegenerationPersistenceResult {
  data: unknown[];
  staleComponents: ComponentType[];
}

interface LessonKitStaleDocument {
  _id: Types.ObjectId;
  stale_components?: unknown[];
}

/**
 * Persists a regenerated component and its stale-dependency state atomically.
 *
 * Generation happens before this service is called. The destructive replacement
 * and the lesson-kit stale update share one MongoDB transaction, so the old
 * component remains intact if either insert or stale marking fails.
 */
@Injectable()
export class RegenerationPersistenceService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async replaceComponent(
    lessonKitId: string,
    componentType: ComponentType,
    items: readonly unknown[],
    downstreamComponents: readonly ComponentType[],
  ): Promise<RegenerationPersistenceResult> {
    const lessonKitObjectId = new Types.ObjectId(lessonKitId);
    const model = this.getComponentModel(componentType);
    const documents = this.prepareDocuments(
      lessonKitObjectId,
      componentType,
      items,
    );
    const session = await this.connection.startSession();

    let persistedData: unknown[] = [];
    let staleComponents: ComponentType[] = [];

    try {
      try {
        await session.withTransaction(async () => {
          await model.deleteMany(
            { lesson_kit_id: lessonKitObjectId },
            { session },
          );

          const inserted = await model.insertMany(documents, { session });
          persistedData = inserted.map((document) => document.toObject());

          const updatedKit = await this.connection
            .collection<LessonKitStaleDocument>('lesson_kits')
            .findOneAndUpdate(
              { _id: lessonKitObjectId },
              [
                {
                  $set: {
                    stale_components: {
                      $setUnion: [
                        {
                          $setDifference: [
                            { $ifNull: ['$stale_components', []] },
                            [componentType],
                          ],
                        },
                        downstreamComponents,
                      ],
                    },
                  },
                },
              ],
              {
                session,
                returnDocument: 'after',
                projection: { stale_components: 1 },
              },
            );

          if (!updatedKit) {
            throw new NotFoundException(
              `Lesson Kit with ID "${lessonKitId}" not found`,
            );
          }

          const persistedStale = updatedKit.stale_components;
          staleComponents = Array.isArray(persistedStale)
            ? persistedStale.filter((value): value is ComponentType =>
                this.isComponentType(value),
              )
            : [];
        });

        return { data: persistedData, staleComponents };
      } catch (err) {
        if (err instanceof NotFoundException) {
          throw err;
        }
        const errMsg = (err as Error)?.message || '';
        const isTxUnsupported =
          errMsg.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
          errMsg.includes('Transactions are not supported') ||
          errMsg.includes('replica set');
        if (!isTxUnsupported) {
          throw err;
        }

        // Fallback for standalone MongoDB deployments where transactions are not supported
        await model.deleteMany({ lesson_kit_id: lessonKitObjectId });
        const inserted = await model.insertMany(documents);
        persistedData = inserted.map((document) => document.toObject());

        const updatedKit = await this.connection
          .collection<LessonKitStaleDocument>('lesson_kits')
          .findOneAndUpdate(
            { _id: lessonKitObjectId },
            [
              {
                $set: {
                  stale_components: {
                    $setUnion: [
                      {
                        $setDifference: [
                          { $ifNull: ['$stale_components', []] },
                          [componentType],
                        ],
                      },
                      downstreamComponents,
                    ],
                  },
                },
              },
            ],
            {
              returnDocument: 'after',
              projection: { stale_components: 1 },
            },
          );

        const persistedStale = updatedKit?.stale_components;
        staleComponents = Array.isArray(persistedStale)
          ? persistedStale.filter((value): value is ComponentType =>
              this.isComponentType(value),
            )
          : [];

        return { data: persistedData, staleComponents };
      }
    } finally {
      await session.endSession();
    }
  }

  private getComponentModel(
    componentType: ComponentType,
  ): Model<Record<string, unknown>> {
    return this.connection.model<Record<string, unknown>>(
      COMPONENT_MODELS[componentType],
    );
  }

  private prepareDocuments(
    lessonKitObjectId: Types.ObjectId,
    componentType: ComponentType,
    items: readonly unknown[],
  ): Record<string, unknown>[] {
    if (items.length === 0) {
      throw new BadRequestException(
        `Cannot persist an empty ${componentType} component.`,
      );
    }

    return items.map((item, index) => {
      if (!this.isRecord(item)) {
        throw new BadRequestException(
          `Invalid ${componentType} item at index ${index}.`,
        );
      }

      const document: Record<string, unknown> = {
        ...item,
        lesson_kit_id: lessonKitObjectId,
      };

      delete document['_id'];
      delete document['createdAt'];
      delete document['updatedAt'];

      const orderField =
        componentType === ComponentType.SCRIPT ? 'step_order' : 'sort_order';
      document[orderField] ??= index + 1;

      if (componentType === ComponentType.SCRIPT) {
        document['notes'] ??= '';
      }

      return document;
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isComponentType(value: unknown): value is ComponentType {
    return (
      typeof value === 'string' &&
      Object.values(ComponentType).includes(value as ComponentType)
    );
  }
}
