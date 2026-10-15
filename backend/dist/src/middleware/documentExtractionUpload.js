import multer from 'multer';
const documentExtractionUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
            return;
        }
        cb(new Error('Only PDF and image files are allowed'));
    },
}).single('file');
export default documentExtractionUpload;
