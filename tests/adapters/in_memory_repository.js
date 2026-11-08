/**
 * in_memory_repository.js - Isolated In-Memory Adapter & Test Repository
 * HRT Inventory System — โรงเรียนหรเทพ(รุ่งเรืองประชาสามัคคี)
 * 
 * Provides mock transport, repository, clock, and ID generator for offline testing and demo runners.
 * Completely decoupled from production Google Sheets and production Apps Script runtime.
 */

const { createSyntheticDatabase } = require('../fixtures/synthetic_fixtures');

class InMemoryInventoryRepository {
  constructor(initialData = null) {
    const db = initialData || createSyntheticDatabase();
    this.items = db.items;
  }

  async getItems(filter = {}) {
    let result = [...this.items];
    if (filter.category && filter.category !== 'ALL') {
      result = result.filter(i => i.category && i.category.includes(filter.category));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(i => (i.code && i.code.toLowerCase().includes(q)) || (i.name && i.name.toLowerCase().includes(q)));
    }
    if (filter.warehouse && filter.warehouse !== 'ALL') {
      result = result.filter(i => i.warehouse === filter.warehouse);
    }
    return { success: true, items: result, total: result.length };
  }

  async getItemByCode(code) {
    if (!code) return null;
    const found = this.items.find(i => i.code === code);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async updateStock(code, delta) {
    const item = this.items.find(i => i.code === code);
    if (!item) throw new Error(`ITEM_NOT_FOUND: ${code}`);
    if (item.stock + delta < 0) throw new Error(`INSUFFICIENT_STOCK: Item ${code}`);
    item.stock += delta;
    item.total_val = item.stock * item.unit_cost;
    return item;
  }
}

class InMemoryRequisitionRepository {
  constructor(initialData = null) {
    const db = initialData || createSyntheticDatabase();
    this.requisitions = db.requisitions;
  }

  async getRequisitions(filter = {}) {
    let list = [...this.requisitions];
    if (filter.status && filter.status !== 'ALL') {
      list = list.filter(r => r.status === filter.status);
    }
    if (filter.teacher) {
      list = list.filter(r => r.teacher && r.teacher.includes(filter.teacher));
    }
    return { success: true, requisitions: list, total: list.length };
  }

  async getRequisitionById(id) {
    const found = this.requisitions.find(r => r.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async saveRequisition(req) {
    const idx = this.requisitions.findIndex(r => r.id === req.id);
    if (idx >= 0) {
      this.requisitions[idx] = req;
    } else {
      this.requisitions.unshift(req);
    }
    return req;
  }
}

class InMemoryCurrentUserProvider {
  constructor(initialUsers = null) {
    const db = initialUsers || createSyntheticDatabase();
    this.users = db.users;
    this.currentUser = this.users[0]; // Default to Admin for test harness
  }

  getCurrentUser() {
    return JSON.parse(JSON.stringify(this.currentUser));
  }

  switchRole(role) {
    const found = this.users.find(u => u.role === role);
    if (found) {
      this.currentUser = found;
      return this.currentUser;
    }
    throw new Error(`ROLE_NOT_FOUND_IN_TEST_USERS: ${role}`);
  }
}

class SystemClock {
  constructor(fixedTime = null) {
    this.fixedTime = fixedTime ? new Date(fixedTime).getTime() : null;
  }

  now() {
    return this.fixedTime ? this.fixedTime : Date.now();
  }

  toISOString() {
    return new Date(this.now()).toISOString();
  }
}

class IdGenerator {
  static generateRequestId() {
    return `REQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }

  static generateRequisitionNo(year = 2569, count = 1) {
    return `REQ-${year}/${String(count).padStart(3, '0')}`;
  }
}

module.exports = {
  InMemoryInventoryRepository,
  InMemoryRequisitionRepository,
  InMemoryCurrentUserProvider,
  SystemClock,
  IdGenerator
};
