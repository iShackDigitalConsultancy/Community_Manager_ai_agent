import { Router } from 'express';
import { unitsController } from './units.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireSchemeAccess } from '../../middleware/scheme-scope.middleware';
import multer from 'multer';

const upload = multer({ dest: '/tmp/csv-uploads/' });

const router = Router({ mergeParams: true });

router.use(requireAuth as any, requireSchemeAccess as any);

router.get('/', unitsController.list as any);
router.get('/:unitId', unitsController.get as any);
router.post('/', unitsController.create as any);
router.put('/:unitId', unitsController.update as any);
router.delete('/:unitId', unitsController.delete as any);
router.post('/import', upload.single('file'), unitsController.importCsv as any);

export const unitsRoutes = router;
