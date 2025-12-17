#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RULES_DIR = path.join(__dirname, '..', '.cursor', 'rules');
const OUTPUT_FILE = path.join(__dirname, '..', '.cursorrules');

function extractContent(markdownContent) {
  // Remove frontmatter (lines between --- markers)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = markdownContent.match(frontmatterRegex);
  
  if (match) {
    // Extract frontmatter metadata
    const frontmatter = match[1];
    const descriptionMatch = frontmatter.match(/description:\s*(.+)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : null;
    
    // Get content after frontmatter
    const content = markdownContent.replace(frontmatterRegex, '').trim();
    
    return { description, content };
  }
  
  return { description: null, content: markdownContent.trim() };
}

function syncRules() {
  if (!fs.existsSync(RULES_DIR)) {
    console.error(`Rules directory not found: ${RULES_DIR}`);
    process.exit(1);
  }

  const rules = [];
  const ruleDirs = fs.readdirSync(RULES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // Sort to ensure consistent order (always-apply rules first)
  ruleDirs.sort((a, b) => {
    const aPath = path.join(RULES_DIR, a, 'RULE.md');
    const bPath = path.join(RULES_DIR, b, 'RULE.md');
    
    if (!fs.existsSync(aPath) || !fs.existsSync(bPath)) return 0;
    
    const aContent = fs.readFileSync(aPath, 'utf-8');
    const bContent = fs.readFileSync(bPath, 'utf-8');
    
    const aAlwaysApply = aContent.includes('alwaysApply: true');
    const bAlwaysApply = bContent.includes('alwaysApply: true');
    
    if (aAlwaysApply && !bAlwaysApply) return -1;
    if (!aAlwaysApply && bAlwaysApply) return 1;
    return 0;
  });

  for (const dir of ruleDirs) {
    const ruleFile = path.join(RULES_DIR, dir, 'RULE.md');
    if (fs.existsSync(ruleFile)) {
      const content = fs.readFileSync(ruleFile, 'utf-8');
      const { description, content: ruleContent } = extractContent(content);
      
      const alwaysApply = content.includes('alwaysApply: true');
      rules.push({
        name: dir,
        description,
        content: ruleContent,
        alwaysApply
      });
    }
  }

  // Build the combined .cursorrules file
  let output = '# Project Rules for tgbots\n\n';
  output += '<!-- This file is auto-generated from .cursor/rules/ directory. -->\n';
  output += '<!-- Edit rules in .cursor/rules/ and run: npm run sync-rules -->\n\n';

  for (const rule of rules) {
    // Use description from frontmatter, or generate from directory name
    let header = rule.description;
    if (!header) {
      header = rule.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Add "ALWAYS APPLY" prefix for rules that should always apply
    if (rule.alwaysApply) {
      header = `ALWAYS APPLY: ${header}`;
    }
    
    // Check if content already starts with a header (##)
    const contentStartsWithHeader = rule.content.trim().startsWith('##');
    
    if (!contentStartsWithHeader) {
      output += `## ${header}\n\n`;
    }
    
    output += rule.content;
    output += '\n\n';
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`✅ Synced ${rules.length} rule(s) to .cursorrules`);
}

syncRules();

