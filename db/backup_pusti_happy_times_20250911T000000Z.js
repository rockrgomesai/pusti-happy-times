#!/usr/bin/env node
/**
 * MongoDB Backup Script (Single-Run)
 * Generates a timestamped dump of the pusti_happy_times database into ./db/backups
 *
 * Usage:
 *   node db/backup_pusti_happy_times_YYYYMMDDThhmmssZ.js
 *
 * Requirements:
 *   - mongodump must be installed and available in PATH
 *   - MONGODB_URI env var or fallback URI inside this script
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config
const DB_NAME = 'pusti_happy_times';
const DEFAULT_URI = 'mongodb://admin:password123@localhost:27017/pusti_happy_times?authSource=admin';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

function ts() {
	return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function run() {
	const stamp = ts();
	const backupsDir = path.join(__dirname, 'backups');
	if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

	const outDir = path.join(backupsDir, `${DB_NAME}_backup_${stamp}`);
	const archive = `${outDir}.gz`;

	try {
		console.log(`📦 Creating backup: ${archive}`);
		const cmd = `mongodump --uri="${MONGODB_URI}" --db="${DB_NAME}" --archive="${archive}" --gzip`;
		execSync(cmd, { stdio: 'inherit' });
		console.log('✅ Backup completed');
		console.log(`➡️  File: ${archive}`);
	} catch (err) {
		console.error('❌ Backup failed:', err.message);
		process.exitCode = 1;
	}
}

run();
