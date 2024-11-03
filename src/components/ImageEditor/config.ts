export const editorConfig = {
  theme: {
    main: '#1e293b',
    secondary: '#2d3748',
    border: '#3f495e',
    text: '#ffffff',
    icon: '#d1d5db',
    iconHover: '#ffffff'
  },
  tools: {
    crop: true,
    rotate: true,
    flip: true,
    draw: true,
    shape: true,
    text: true,
    filter: true,
    mask: true,
    icon: true
  },
  defaultTool: 'filter',
  filters: [
    'brightness',
    'contrast',
    'saturation',
    'vibrance',
    'exposure',
    'hue',
    'sepia',
    'noise',
    'vintage',
    'colorize',
    'sharpen',
    'emboss',
    'blur'
  ],
  menuPosition: 'bottom',
  menuStyle: 'compact',
  uiSize: {
    width: '100%',
    height: '100%'
  },
  selectionStyle: {
    cornerSize: 20,
    rotatingPointOffset: 70,
    borderColor: '#00a9ff',
    cornerColor: '#00a9ff'
  }
} as const;