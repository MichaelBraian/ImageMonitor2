export type FileType = '2D' | '3D';
export type ImageGroup = 'Before' | 'After' | 'Unsorted';

export interface Patient {
  id: string;
  name: string;
  dentistId: string;
  createdAt: string;
}

export interface DentalFile {
  id: string;
  name: string;
  url: string;
  type: FileType;
  format: string;
  group: ImageGroup | string;
  patientId: string;
  dentistId: string;
  uploadedAt: string;
  path: string;
  thumbnailUrl?: string;
}