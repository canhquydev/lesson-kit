import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ComponentType } from '../../common/enums';
import { RegenerationPersistenceService } from './regeneration-persistence.service';

describe('RegenerationPersistenceService', () => {
  const lessonKitId = new Types.ObjectId().toHexString();
  const generatedVocabulary = [
    {
      word: 'force',
      phonetic: '/fɔːrs/',
      meaning_vi: 'lực',
      part_of_speech: 'noun',
      example_sentence: 'Force changes motion.',
      context_note: 'Physics',
      sort_order: 1,
    },
  ];

  let transactionActive: boolean;
  let lastUpdatePipeline: unknown;
  let session: {
    withTransaction: jest.Mock;
    endSession: jest.Mock;
  };
  let componentModel: {
    deleteMany: jest.Mock;
    insertMany: jest.Mock;
  };
  let lessonKitsCollection: { findOneAndUpdate: jest.Mock };
  let connection: {
    startSession: jest.Mock;
    model: jest.Mock;
    collection: jest.Mock;
  };
  let service: RegenerationPersistenceService;

  beforeEach(() => {
    transactionActive = false;
    lastUpdatePipeline = undefined;
    session = {
      withTransaction: jest
        .fn()
        .mockImplementation(async (work: () => Promise<unknown>) => {
          transactionActive = true;
          try {
            return await work();
          } finally {
            transactionActive = false;
          }
        }),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    componentModel = {
      deleteMany: jest.fn().mockImplementation(() => {
        expect(transactionActive).toBe(true);
        return Promise.resolve({ deletedCount: 1 });
      }),
      insertMany: jest
        .fn()
        .mockImplementation((documents: Record<string, unknown>[]) => {
          expect(transactionActive).toBe(true);
          return Promise.resolve(
            documents.map((document) => ({
              toObject: () => document,
            })),
          );
        }),
    };
    lessonKitsCollection = {
      findOneAndUpdate: jest
        .fn()
        .mockImplementation((_filter: unknown, update: unknown) => {
          expect(transactionActive).toBe(true);
          lastUpdatePipeline = update;
          return Promise.resolve({
            stale_components: [
              ComponentType.SCRIPT,
              ComponentType.QUESTIONS,
              ComponentType.ASSESSMENT,
            ],
          });
        }),
    };
    connection = {
      startSession: jest.fn().mockResolvedValue(session),
      model: jest.fn().mockReturnValue(componentModel),
      collection: jest.fn().mockReturnValue(lessonKitsCollection),
    };
    service = new RegenerationPersistenceService(connection as never);
  });

  it('replaces data and marks downstream components in one transaction', async () => {
    const downstream = [
      ComponentType.SCRIPT,
      ComponentType.QUESTIONS,
      ComponentType.ASSESSMENT,
    ];

    const result = await service.replaceComponent(
      lessonKitId,
      ComponentType.VOCABULARY,
      generatedVocabulary,
      downstream,
    );

    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(componentModel.deleteMany).toHaveBeenCalledWith(
      { lesson_kit_id: new Types.ObjectId(lessonKitId) },
      { session },
    );
    expect(componentModel.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          ...generatedVocabulary[0],
          lesson_kit_id: new Types.ObjectId(lessonKitId),
        }),
      ],
      { session },
    );
    expect(lessonKitsCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: new Types.ObjectId(lessonKitId) },
      expect.any(Array),
      expect.objectContaining({ session, returnDocument: 'after' }),
    );
    expect(result.staleComponents).toEqual(downstream);
    expect(result.data).toHaveLength(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('removes the regenerated component from a previous stale list', async () => {
    await service.replaceComponent(
      lessonKitId,
      ComponentType.SCRIPT,
      [{ activity_name: 'Warm-up', step_order: 1 }],
      [ComponentType.QUESTIONS, ComponentType.ASSESSMENT],
    );

    expect(JSON.stringify(lastUpdatePipeline)).toContain('$setDifference');
    expect(JSON.stringify(lastUpdatePipeline)).toContain(ComponentType.SCRIPT);
  });

  it('ends the session and propagates an insert failure', async () => {
    componentModel.insertMany.mockRejectedValueOnce(new Error('insert failed'));

    await expect(
      service.replaceComponent(
        lessonKitId,
        ComponentType.VOCABULARY,
        generatedVocabulary,
        [],
      ),
    ).rejects.toThrow('insert failed');
    expect(lessonKitsCollection.findOneAndUpdate).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('throws when the lesson kit disappears during the transaction', async () => {
    lessonKitsCollection.findOneAndUpdate.mockResolvedValueOnce(null);

    await expect(
      service.replaceComponent(
        lessonKitId,
        ComponentType.VOCABULARY,
        generatedVocabulary,
        [],
      ),
    ).rejects.toThrow(NotFoundException);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('rejects an empty generated component before starting a transaction', async () => {
    await expect(
      service.replaceComponent(lessonKitId, ComponentType.VOCABULARY, [], []),
    ).rejects.toThrow(BadRequestException);
    expect(connection.startSession).not.toHaveBeenCalled();
  });
});
