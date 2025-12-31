#!/usr/bin/env node

/**
 * 移除语言包文件中的重复键并统一格式
 */

const fs = require('fs');
const path = require('path');

function dedupeAndFormat(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  // 由于 JSON 对象不能有重复键，parse 时已自动保留最后一个
  // 但我们需要统一大小写并确保一致性

  // 定义应该保留的键名（使用更常用的形式）
  const keyMapping = {
    'Enter action description (optional)': 'Enter Action description (optional)',
    'No data': 'No Data',
    'Toggle theme': 'Toggle Theme',
  };

  const result = {};
  const removed = [];

  // 处理所有键
  for (const [key, value] of Object.entries(data)) {
    // 检查是否需要统一大小写
    const normalizedKey = keyMapping[key] || key;

    if (normalizedKey !== key) {
      // 如果键被映射了，检查目标键是否已存在
      if (result[normalizedKey] === undefined) {
        result[normalizedKey] = value;
        removed.push(`"${key}" -> "${normalizedKey}"`);
      } else {
        removed.push(`"${key}" (duplicate, removed)`);
      }
    } else {
      result[key] = value;
    }
  }

  // 按字母顺序排序键
  const sorted = {};
  Object.keys(result)
    .sort()
    .forEach((key) => {
      sorted[key] = result[key];
    });

  // 写入文件，使用 2 空格缩进
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');

  return {
    removed: removed.length,
    totalKeys: Object.keys(sorted).length,
    details: removed,
  };
}

const messagesDir = path.join(__dirname, '..', 'messages');
const enPath = path.join(messagesDir, 'en.json');
const zhPath = path.join(messagesDir, 'zh-CN.json');

console.log('Processing language files...\n');

const enResult = dedupeAndFormat(enPath);
const zhResult = dedupeAndFormat(zhPath);

console.log('en.json:');
console.log(`  Total keys: ${enResult.totalKeys}`);
console.log(`  Keys processed: ${enResult.removed}`);
if (enResult.details.length > 0) {
  console.log('  Changes:');
  enResult.details.forEach((d) => console.log(`    - ${d}`));
}

console.log('\nzh-CN.json:');
console.log(`  Total keys: ${zhResult.totalKeys}`);
console.log(`  Keys processed: ${zhResult.removed}`);
if (zhResult.details.length > 0) {
  console.log('  Changes:');
  zhResult.details.forEach((d) => console.log(`    - ${d}`));
}

console.log('\n✓ Language files deduplicated and formatted!');
