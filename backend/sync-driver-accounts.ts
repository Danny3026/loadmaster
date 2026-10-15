import db from './src/config/database';
import { driverService } from './src/services/driver.service';

async function main() {
  const companyId = process.argv[2];
  const report = await driverService.synchronizeDriverAccounts(companyId);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });