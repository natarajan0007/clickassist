# Skill: Add a New Service Provider

When adding a new service provider (AI, TTS, transcription, OmniParser), follow this pattern:

## Steps

1. Define or extend the provider interface in `interface.ts`:
   ```typescript
   export interface MyProvider {
     methodName(params: InputType): Promise<OutputType>;
   }
   ```

2. Create a new file for the implementation (e.g., `newprovider.ts`):
   ```typescript
   export class NewProvider implements MyProvider {
     constructor(private apiKey: string) {}
     async methodName(params: InputType): Promise<OutputType> { ... }
   }
   ```

3. Add the provider to the factory function in `interface.ts`:
   ```typescript
   case 'newprovider':
     const { NewProvider } = require('./newprovider');
     return new NewProvider(settings.get('newproviderApiKey'));
   ```

4. Add settings fields to `src/main/settings.ts` (schema + defaults).

5. Add UI controls to `src/renderer/settings/index.html`.

6. If the provider has a HIPAA-incompatible mode, add enforcement in HIPAA mode logic.
