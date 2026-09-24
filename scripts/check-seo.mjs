import { extraTools } from "../src/config/extra-tools.ts";
import { categoryMeta } from "../src/config/categories.ts";
import { prioritySeoContent } from "../src/config/seo-content.ts";

const errors = [];

function duplicates(items, key) {
  const seen = new Map();
  for (const item of items) {
    const value = item[key];
    const ids = seen.get(value) ?? [];
    ids.push(item.id ?? item.key);
    seen.set(value, ids);
  }
  return [...seen.entries()].filter(([, ids]) => ids.length > 1);
}

for (const [value, ids] of duplicates(extraTools, "title")) {
  errors.push(`duplicate SEO title: ${ids.join(", ")} -> ${value}`);
}
for (const [value, ids] of duplicates(extraTools, "description")) {
  errors.push(`duplicate meta description: ${ids.join(", ")} -> ${value}`);
}

for (const tool of extraTools) {
  const titleLength = [...tool.title].length;
  const descriptionLength = [...tool.description].length;

  if (titleLength < 12 || titleLength > 45) {
    errors.push(`SEO title length out of range: ${tool.id} -> ${titleLength}`);
  }
  if (descriptionLength < 20 || descriptionLength > 100) {
    errors.push(`meta description length out of range: ${tool.id} -> ${descriptionLength}`);
  }
  if (!tool.name.trim() || !tool.title.trim() || !tool.description.trim()) {
    errors.push(`missing SEO text: ${tool.id}`);
  }
  if (!Array.isArray(tool.faqs) || tool.faqs.length < 2) {
    errors.push(`at least 2 FAQs required: ${tool.id}`);
  }

  const faqQuestions = new Set();
  for (const [question, answer] of tool.faqs) {
    if (!question.trim() || !answer.trim()) errors.push(`empty FAQ: ${tool.id}`);
    if (faqQuestions.has(question)) errors.push(`duplicate FAQ question: ${tool.id} -> ${question}`);
    faqQuestions.add(question);
  }
}

const categoryKeys = new Set(categoryMeta.map((category) => category.key));
for (const category of categoryMeta) {
  const titleLength = [...category.title].length;
  const descriptionLength = [...category.description].length;
  if (titleLength < 12 || titleLength > 50) {
    errors.push(`category title length out of range: ${category.key} -> ${titleLength}`);
  }
  if (descriptionLength < 30 || descriptionLength > 120) {
    errors.push(`category description length out of range: ${category.key} -> ${descriptionLength}`);
  }
  if (!Array.isArray(category.useCases) || category.useCases.length < 3) {
    errors.push(`category use cases missing: ${category.key}`);
  } else if (category.useCases.some((item) => !item.trim())) {
    errors.push(`empty category use case: ${category.key}`);
  }
}
for (const tool of extraTools) {
  if (!categoryKeys.has(tool.categoryKey)) errors.push(`missing category landing page: ${tool.id} -> ${tool.categoryKey}`);
}

const toolHrefs = new Set([...extraTools.map((tool) => tool.href), "/image/batch-converter/", "/csv/split/", "/text/remove-duplicates/"]);
const priorityEntries = Object.entries(prioritySeoContent);
if (priorityEntries.length < 20) errors.push(`priority SEO coverage too small: ${priorityEntries.length}`);
for (const [href, content] of priorityEntries) {
  if (!toolHrefs.has(href)) errors.push(`priority SEO points to missing tool: ${href}`);
  if ([...content.lead].length < 45) errors.push(`priority SEO lead too short: ${href}`);
  if (!Array.isArray(content.useCases) || content.useCases.length < 3 || content.useCases.some((item) => !item.trim())) errors.push(`priority SEO use cases invalid: ${href}`);
  if (!content.example?.input?.trim() || !content.example?.output?.trim()) errors.push(`priority SEO example invalid: ${href}`);
  if (!Array.isArray(content.tips) || content.tips.length < 2 || content.tips.some((item) => !item.trim())) errors.push(`priority SEO tips invalid: ${href}`);
}

if (errors.length) {
  console.error("SEO metadata validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log(`SEO metadata OK: ${extraTools.length} tools / ${categoryMeta.length} categories / ${priorityEntries.length} priority pages.`);
