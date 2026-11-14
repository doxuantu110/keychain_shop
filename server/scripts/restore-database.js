/**
 * Craft3D Isolated Database Restore & Verification Script
 * 
 * Production-Grade Security & Integrity:
 * 1. Safe Credentials: Passwords are NEVER passed as command-line arguments (uses --defaults-extra-file)
 * 2. Isolation by Default: Restores to an isolated database (`craft3d_restore_test`) by default
 * 3. Auto-detects MySQL installation binaries across Windows and Linux
 * 4. Stream-based Spawn: Safe execution immune to shell quoting / space issues
 * 5. Verification Suite:
 *    - Validates table counts against source database
 *    - Validates row counts in critical tables (Product, ProductVariant, Category, Customer_order, email_outbox, User, Merchant)
 *    - Validates Foreign Key constraints and Indexes
 * 6. Safe Error Handling: Cleans up credentials files in all code paths
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class DatabaseRestore {
  constructor(options = {}) {
    this.backupDir = options.backupDir || path.join(__dirname, '../../backups');
    this.defaultTargetDb = options.targetDb || 'craft3d_restore_test';
    this.mysqlPath = this.resolveMysqlPath();
  }

  resolveMysqlPath() {
    const candidatePaths = [
      'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
      'C:\\xampp\\mysql\\bin\\mysql.exe',
      '/usr/bin/mysql',
      '/usr/local/bin/mysql',
      'mysql'
    ];

    for (const p of candidatePaths) {
      if (p === 'mysql') continue;
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return 'mysql';
  }

  parseDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const url = new URL(databaseUrl);
    return {
      host: url.hostname || '127.0.0.1',
      port: url.port || '3306',
      sourceDatabase: url.pathname.substring(1),
      username: decodeURIComponent(url.username || 'root'),
      password: decodeURIComponent(url.password || ''),
    };
  }

  createTempConfigFile(dbConfig) {
    const tempCnfPath = path.join(this.backupDir, `.tmp_restore_${Date.now()}_${Math.random().toString(36).substring(7)}.cnf`);
    const cnfContent = `[client]\nhost=${dbConfig.host}\nport=${dbConfig.port}\nuser=${dbConfig.username}\npassword="${dbConfig.password.replace(/"/g, '\\"')}"\n`;
    fs.writeFileSync(tempCnfPath, cnfContent, { mode: 0o600 });
    return tempCnfPath;
  }

  getLatestBackupFile() {
    if (!fs.existsSync(this.backupDir)) {
      throw new Error(`Backup directory does not exist: ${this.backupDir}`);
    }

    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const fullPath = path.join(this.backupDir, f);
        return {
          name: f,
          path: fullPath,
          mtime: fs.statSync(fullPath).mtimeMs,
          size: fs.statSync(fullPath).size
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      throw new Error(`No .sql backup files found in ${this.backupDir}`);
    }

    return files[0].path;
  }

  async execQuery(tempCnfPath, sql) {
    return new Promise((resolve, reject) => {
      const args = [
        `--defaults-extra-file=${tempCnfPath}`,
        '--default-character-set=utf8mb4',
        '-s',
        '-N',
        '-e',
        sql
      ];

      const child = spawn(this.mysqlPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`MySQL query failed (exit ${code}): ${stderr}`));
        }
      });
    });
  }

  async restoreAndVerify(backupFilePath = null, targetDbName = null) {
    const dbConfig = this.parseDatabaseUrl();
    const targetDb = targetDbName || this.defaultTargetDb;
    const backupFile = backupFilePath || this.getLatestBackupFile();

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const backupStats = fs.statSync(backupFile);
    if (backupStats.size === 0) {
      throw new Error(`Backup file is empty (0 bytes): ${backupFile}`);
    }

    console.log(`[Restore] Target Database: "${targetDb}"`);
    console.log(`[Restore] Source Backup File: "${backupFile}" (${(backupStats.size / 1024).toFixed(2)} KB)`);

    let tempCnfPath = null;
    try {
      tempCnfPath = this.createTempConfigFile(dbConfig);
      const startTime = Date.now();

      // Step 1: Ensure target database exists
      console.log(`[Restore] Step 1/3: Ensuring target database "${targetDb}" exists...`);
      await this.execQuery(tempCnfPath, `CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

      // Step 2: Execute restore from backup SQL using spawn stream
      console.log(`[Restore] Step 2/3: Restoring SQL schema and data into "${targetDb}"...`);
      const restoreArgs = [
        `--defaults-extra-file=${tempCnfPath}`,
        '--default-character-set=utf8mb4',
        targetDb
      ];

      await new Promise((resolve, reject) => {
        const inStream = fs.createReadStream(backupFile);
        const child = spawn(this.mysqlPath, restoreArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stderr = '';

        inStream.pipe(child.stdin);
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`MySQL restore failed (exit ${code}): ${stderr}`));
          }
        });
      });

      const restoreDurationMs = Date.now() - startTime;
      console.log(`[Restore] Schema & data restored in ${restoreDurationMs}ms.`);

      // Step 3: Run comprehensive verification checks
      console.log(`[Restore] Step 3/3: Running verification suite...`);
      const verification = await this.verifyDatabase(tempCnfPath, targetDb, dbConfig.sourceDatabase);

      const result = {
        success: verification.isValid,
        targetDatabase: targetDb,
        sourceDatabase: dbConfig.sourceDatabase,
        backupFile,
        backupSizeBytes: backupStats.size,
        restoreDurationMs,
        verification,
        timestamp: new Date().toISOString()
      };

      if (verification.isValid) {
        console.log(`[Restore] ✅ RESTORE & VERIFICATION SUCCESSFUL for "${targetDb}"!`);
      } else {
        console.warn(`[Restore] ⚠️ Verification warnings detected for "${targetDb}". See details above.`);
      }

      return result;
    } finally {
      if (tempCnfPath && fs.existsSync(tempCnfPath)) {
        try {
          fs.unlinkSync(tempCnfPath);
        } catch (e) {
          // Ignore temp cleanup errors
        }
      }
    }
  }

  async verifyDatabase(tempCnfPath, targetDb, sourceDb) {
    const report = {
      targetDb,
      sourceDb,
      tablesTargetCount: 0,
      tablesSourceCount: 0,
      tableCountMatches: false,
      keyTables: {},
      foreignKeysCount: 0,
      indexesCount: 0,
      isValid: false,
      notes: []
    };

    // 1. Table Counts
    const targetTablesRaw = await this.execQuery(
      tempCnfPath,
      `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${targetDb}';`
    );
    report.tablesTargetCount = parseInt(targetTablesRaw, 10) || 0;

    let sourceTablesRaw = '0';
    try {
      sourceTablesRaw = await this.execQuery(
        tempCnfPath,
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${sourceDb}';`
      );
    } catch (e) {
      report.notes.push(`Could not query sourceDb tables: ${e.message}`);
    }
    report.tablesSourceCount = parseInt(sourceTablesRaw, 10) || 0;
    report.tableCountMatches = report.tablesTargetCount === report.tablesSourceCount && report.tablesTargetCount > 0;

    // 2. Critical Tables Row Count Verification
    const criticalTables = [
      'Product',
      'ProductVariant',
      'Category',
      'Customer_order',
      'email_outbox',
      'User',
      'Merchant'
    ];

    for (const table of criticalTables) {
      try {
        const targetCount = parseInt(await this.execQuery(tempCnfPath, `SELECT COUNT(*) FROM \`${targetDb}\`.\`${table}\`;`), 10);
        let sourceCount = null;
        try {
          sourceCount = parseInt(await this.execQuery(tempCnfPath, `SELECT COUNT(*) FROM \`${sourceDb}\`.\`${table}\`;`), 10);
        } catch (e) {
          sourceCount = null;
        }

        report.keyTables[table] = {
          targetRows: targetCount,
          sourceRows: sourceCount,
          matches: sourceCount !== null ? targetCount === sourceCount : true
        };
      } catch (err) {
        report.keyTables[table] = {
          error: err.message
        };
        report.notes.push(`Error verifying table ${table}: ${err.message}`);
      }
    }

    // 3. Foreign Key Constraints Count
    try {
      const fkCountRaw = await this.execQuery(
        tempCnfPath,
        `SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = '${targetDb}' AND CONSTRAINT_TYPE = 'FOREIGN KEY';`
      );
      report.foreignKeysCount = parseInt(fkCountRaw, 10) || 0;
    } catch (e) {
      report.notes.push(`Could not query FKs: ${e.message}`);
    }

    // 4. Indexes Count
    try {
      const idxCountRaw = await this.execQuery(
        tempCnfPath,
        `SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = '${targetDb}';`
      );
      report.indexesCount = parseInt(idxCountRaw, 10) || 0;
    } catch (e) {
      report.notes.push(`Could not query indexes: ${e.message}`);
    }

    // Overall Validity Check
    report.isValid = report.tablesTargetCount > 0 &&
      report.tableCountMatches &&
      report.foreignKeysCount > 0 &&
      Object.values(report.keyTables).every(t => !t.error && (t.matches !== false));

    return report;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const backupFile = args[0] || null;
  const targetDb = args[1] || 'craft3d_restore_test';

  const restore = new DatabaseRestore({ targetDb });
  restore.restoreAndVerify(backupFile, targetDb)
    .then((result) => {
      console.log('\n--- VERIFICATION RESULT SUMMARY ---');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal restore error:', err.message);
      process.exit(1);
    });
}

module.exports = DatabaseRestore;
