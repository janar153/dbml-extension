import { registerExporter } from './registry';
import { typeormExporter } from './typeorm';
import { sqlExporters } from './sql';

registerExporter(typeormExporter);
sqlExporters.forEach(registerExporter);
// Future exporters: add a single registerExporter(...) line. See specs/09-exporters.md.

export { getExporter, listExporters } from './registry';
