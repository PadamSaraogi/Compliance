import { google } from 'googleapis';
import { Readable } from 'stream';

const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

let auth: any = null;
if (clientEmail && privateKey) {
  auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

const drive = auth ? google.drive({ version: 'v3', auth }) : null;

export async function createFolder(folderName: string, parentId?: string): Promise<string> {
  if (!drive) return 'mock_folder_id';
  
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : (rootFolderId ? [rootFolderId] : []),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, webViewLink',
  });

  // Make folder publicly readable 
  if (file.data.id) {
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  return file.data.id!;
}

export async function uploadFile(fileName: string, mimeType: string, buffer: Buffer, folderId: string) {
  if (!drive) return { id: 'mock_'+Date.now(), viewUrl: 'https://drive.google.com/file/d/mock', downloadUrl: '' };
  
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from(buffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  return {
    id: file.data.id!,
    viewUrl: file.data.webViewLink!,
    downloadUrl: file.data.webContentLink,
  };
}

export async function deleteFile(fileId: string) {
  if (!drive) return true;
  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error('Drive delete error', error);
    return false;
  }
}
