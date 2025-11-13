export class MapRepo {
    constructor() {
      this.items = new Map();
    }
  
    create(item) {
      this.items.set(item.id, item);
      return item;
    }
  
    findById(id) {
      return this.items.get(id) || null;
    }
    findOne(keyOrFn, value, role) {
        
        for (const item of this.items.values()) {
          if (typeof keyOrFn === 'function') {
            if (keyOrFn(item)) return item;
          } else if (item[keyOrFn] === value && role === item.role) {
            
            return item;
          }
        }
        return null;
      }
    
  
    update(id, patch = {}) {
      const existing = this.items.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch };
      if (existing.touch) {
        try { updated.updatedAt = new Date().toISOString(); } catch {}
      }
      this.items.set(id, updated);
      return updated;
    }
  
    delete(id) {
      return this.items.delete(id);
    }
  
    list({ page = 1, perPage = 20, sortBy = 'createdAt', sortDir = 'desc', filterFn ,role } = {}) {
        
      let arr = Array.from(this.items.values()).filter(e=> e.role === role);
      if (filterFn) arr = arr.filter((filterFn));
      arr.sort((a, b) => {
        const av = a?.[sortBy] ?? '';
        const bv = b?.[sortBy] ?? '';
        if (av === bv) return 0;
        if (sortDir === 'asc') return av > bv ? 1 : -1;
        return av < bv ? 1 : -1;
      });
      const total = arr.length;
      const start = (page - 1) * perPage;
      const data = arr.slice(start, start + perPage);
      return { total, page, perPage, data };
    }
  
    clear() {
      this.items.clear();
    }
  }