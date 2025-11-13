// models.js
import { randomUUID } from 'crypto';

export class BaseModel {
  constructor() {
    this.id = randomUUID();
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  touch() {
    this.updatedAt = new Date().toISOString();
  }
}

export class Doctor extends BaseModel {
  constructor({ name, mobile, role = 'DOCTOR' } = {}) {
    super();
    this.name = (name || '').trim();
    this.mobile = (mobile || '').trim();
    this.role = role;
  }

  validate() {
    const errors = [];
    if (!this.name) errors.push('name required');
    if (!this.mobile || this.mobile.length < 10)
      errors.push('valid mobile number required');
    if (!this.role) errors.push('role required');
    return errors;
  }
}

export class Patient extends BaseModel {
  constructor({ name, mobile, role = 'PATIENT' } = {}) {
    super();
    this.name = (name || '').trim();
    this.mobile = (mobile || '').trim();
    this.role = role;
  }

  validate() {
    const errors = [];
    if (!this.name) errors.push('name required');
    if (!this.mobile || this.mobile.length < 10)
      errors.push('valid mobile number required');
    if (!this.role) errors.push('role required');
    return errors;
  }
}