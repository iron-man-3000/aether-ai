import { Router } from 'express';

export const modelsRouter = Router();

modelsRouter.get('/', (req, res) => {
  res.json({
    models: [
      { id: 'gpt-4o', name: 'Aether 4o', isDefault: true },
      { id: 'gpt-4o-mini', name: 'Aether Flash', isDefault: false },
      { id: 'o3-mini', name: 'Aether Reasoning', isDefault: false }
    ]
  });
});
