/**
 * synthetic_fixtures.js - Deterministic Synthetic Test Fixtures Loader & Generator
 * HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
 * 
 * Provides isolated, synthetic, non-production test datasets for testing and demo modes.
 * Contains NO production secrets, real personal credentials, or live database IDs.
 */

const fs = require('fs');
const path = require('path');

const sampleItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample_items.json'), 'utf8'));
const sampleHistories = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample_histories.json'), 'utf8'));
const sampleRequisitions = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample_requisitions.json'), 'utf8'));
const sampleUsers = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample_users.json'), 'utf8'));

/**
 * Creates a fresh deep-copy of synthetic items dataset
 */
function getSyntheticItems() {
  return JSON.parse(JSON.stringify(sampleItems));
}

/**
 * Creates a fresh deep-copy of synthetic movement histories dataset
 */
function getSyntheticHistories() {
  return JSON.parse(JSON.stringify(sampleHistories));
}

/**
 * Creates a fresh deep-copy of synthetic requisitions dataset
 */
function getSyntheticRequisitions() {
  return JSON.parse(JSON.stringify(sampleRequisitions));
}

/**
 * Creates a fresh deep-copy of synthetic users dataset
 */
function getSyntheticUsers() {
  return JSON.parse(JSON.stringify(sampleUsers));
}

/**
 * Generates an isolated in-memory dataset mapping
 */
function createSyntheticDatabase() {
  const items = getSyntheticItems();
  const histories = getSyntheticHistories();
  const requisitions = getSyntheticRequisitions();
  const users = getSyntheticUsers();

  const mappedItems = items.map((item, index) => {
    let currentStock = item.stock;
    if (item.code === "OFF-003") currentStock = 8;
    if (item.code === "IT-011") currentStock = 2;
    if (item.code === "SPT-014") currentStock = 1;
    if (item.code === "JAN-006") currentStock = 3;
    if (item.code === "MED-003") currentStock = 4;

    let status = 'normal';
    if (currentStock <= item.min) status = 'critical';
    else if (currentStock <= item.rop) status = 'low';

    const itemHist = histories.filter(h => h.code === item.code);

    return {
      id: index + 1,
      code: item.code,
      name: item.name,
      category: item.category,
      warehouse: item.warehouse,
      unit: item.unit,
      stock: currentStock,
      min: item.min,
      rop: item.rop,
      unit_cost: item.unit_cost,
      total_val: currentStock * item.unit_cost,
      supplier: item.supplier,
      status: status,
      history: itemHist
    };
  });

  return {
    items: mappedItems,
    histories: histories,
    requisitions: requisitions,
    users: users
  };
}

module.exports = {
  sampleItems,
  sampleHistories,
  sampleRequisitions,
  sampleUsers,
  getSyntheticItems,
  getSyntheticHistories,
  getSyntheticRequisitions,
  getSyntheticUsers,
  createSyntheticDatabase
};
