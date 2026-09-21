import { ContentsManager, Drive, ServerConnection } from '@jupyterlab/services';
import { openOrCreateFromId } from '../commands';
import { JudgeModel } from '../model';

describe('Judge Contents roots', () => {
  afterEach(() => jest.restoreAllMocks());

  function fixture(root?: string) {
    const drive = new Drive(
      root?.startsWith('judge:') ? { name: 'judge' } : {}
    );
    const contents = new ContentsManager(
      root?.startsWith('judge:') ? {} : { defaultDrive: drive }
    );
    if (root?.startsWith('judge:')) {
      contents.addDrive(drive);
    }
    const stored = new Map<string, any>();
    const save = jest
      .spyOn(drive, 'save')
      .mockImplementation(async (path, options) => {
        const value = { ...options, path } as any;
        stored.set(path, value);
        return value;
      });
    jest.spyOn(drive, 'get').mockImplementation(async path => {
      if (!stored.has(path)) {
        throw new ServerConnection.ResponseError(
          new Response('', { status: 404 })
        );
      }
      return stored.get(path);
    });
    const provider: any = {
      getProblem: jest.fn(async () => ({ id: 'hash', title: 'Addition' }))
    };
    const document = {};
    const manager: any = {
      services: { contents },
      openOrReveal: jest.fn(() => document)
    };
    jest
      .spyOn(JudgeModel, 'newFileContent')
      .mockResolvedValue('initial solution');
    return { drive, contents, stored, save, provider, manager, document };
  }

  it.each([
    [
      undefined,
      '.jce-judge/hash/Addition.judge',
      '.jce-judge/hash/Addition.judge'
    ],
    [
      'judge:shared',
      'judge:shared/hash/Addition.judge',
      'shared/hash/Addition.judge'
    ],
    ['judge:', 'judge:hash/Addition.judge', 'hash/Addition.judge'],
    [
      'judge:shared/',
      'judge:shared/hash/Addition.judge',
      'shared/hash/Addition.judge'
    ]
  ])(
    'creates and reuses a solution under %s',
    async (root, globalPath, localPath) => {
      const { contents, stored, save, provider, manager, document } =
        fixture(root);
      try {
        await expect(
          openOrCreateFromId(provider, manager, 'hash', root)
        ).resolves.toBe(document);
        expect(manager.openOrReveal).toHaveBeenCalledWith(globalPath);
        expect(save).toHaveBeenCalledWith(
          localPath,
          expect.objectContaining({
            name: 'Addition.judge',
            type: 'file',
            content: 'initial solution'
          })
        );
        stored.get(localPath!).content = 'saved solution';
        await openOrCreateFromId(provider, manager, 'hash', root);
        expect(stored.get(localPath!).content).toBe('saved solution');
        expect(JudgeModel.newFileContent).toHaveBeenCalledTimes(1);
        expect(
          save.mock.calls.filter(([, options]) => options?.type === 'file')
        ).toHaveLength(1);
        if (root === 'judge:') {
          expect(save).not.toHaveBeenCalledWith('', expect.anything());
        }
      } finally {
        contents.dispose();
      }
    }
  );

  it('does not open a document when reading it is forbidden', async () => {
    const { drive, contents, provider, manager } = fixture('judge:shared');
    const failure = new ServerConnection.ResponseError(
      new Response('', { status: 403 })
    );
    jest.spyOn(drive, 'get').mockRejectedValue(failure);
    try {
      await expect(
        openOrCreateFromId(provider, manager, 'hash', 'judge:shared')
      ).rejects.toBe(failure);
      expect(manager.openOrReveal).not.toHaveBeenCalled();
      expect(JudgeModel.newFileContent).not.toHaveBeenCalled();
    } finally {
      contents.dispose();
    }
  });

  it('does not hide file creation failures', async () => {
    const { contents, save, provider, manager } = fixture();
    const original = save.getMockImplementation()!;
    save.mockImplementation((path, options) =>
      options?.type === 'file'
        ? Promise.reject(new Error('save failed'))
        : original(path, options)
    );
    try {
      await expect(
        openOrCreateFromId(provider, manager, 'hash')
      ).rejects.toThrow('save failed');
      expect(manager.openOrReveal).not.toHaveBeenCalled();
    } finally {
      contents.dispose();
    }
  });
});
