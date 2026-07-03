export async function exportDatabase(): Promise<void> {
  throw new Error('Database export is not available in this project')
}

export async function importDatabase(_file: File): Promise<void> {
  throw new Error('Database import is not available in this project')
}

export const dataApi = {
  exportDatabase,
  importDatabase,
}
