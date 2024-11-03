export interface ImageEditorProps {
  image: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
}

export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

export interface Tools {
  crop: boolean;
  rotate: boolean;
  flip: boolean;
  filter: boolean;
  adjust: boolean;
  draw: boolean;
  text: boolean;
  sticker: boolean;
  frame: boolean;
}