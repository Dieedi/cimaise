import appConfig from '../../../../config/app.json';

export const CURRENT_VERSION = appConfig.save.formatVersion;

type Migration = {
  from: string;
  to: string;
  migrate: (data: any) => any;
};

// Ordered list of migrations.
// To add a format evolution:
// 1. Add an entry { from: "X.Y", to: "X.Z", migrate: (data) => ... }
// 2. Update formatVersion in config/app.json
const migrations: Migration[] = [
  {
    from: '1.0',
    to: '1.1',
    migrate: (data) => {
      // Add frames support
      data.frames = [];
      data.version = '1.1';
      return data;
    },
  },
  {
    from: '1.1',
    to: '1.2',
    migrate: (data) => {
      // Add bgColor to frames
      if (data.frames) {
        data.frames.forEach((frame: any) => {
          if (!frame.bgColor) frame.bgColor = '#2a2a2a';
        });
      }
      data.version = '1.2';
      return data;
    },
  },
];

// Applies all necessary migrations to bring boardData
// from its current version to CURRENT_VERSION.
// Returns the migrated boardData, or the same object if already up to date.
// Throws if an unknown version is encountered (corrupted file or newer than the app).
export function migrateBoard(boardData: any): any {
  let data = structuredClone(boardData);
  let version = data.version;

  if (version === CURRENT_VERSION) {
    return data;
  }

  while (version !== CURRENT_VERSION) {
    const migration = migrations.find(m => m.from === version);
    if (!migration) {
      throw new Error(
        `Unknown version "${version}". ` +
        `The file is either corrupted or was created with a newer version of the app ` +
        `(current version: ${CURRENT_VERSION}).`
      );
    }
    data = migration.migrate(data);
    version = data.version;
  }

  return data;
}
