const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/server/index'); // 这里需要根据实际的服务器入口文件路径进行调整

describe('API Tests', () => {
  // 测试管理页面是否可访问
  describe('Admin Page', () => {
    it('should return 200 OK for admin endpoint', (done) => {
      request(app)
        .get('/admin')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });
  });

  // 测试H5页面是否可访问
  describe('H5 Page', () => {
    it('should return 200 OK for h5 endpoint', (done) => {
      request(app)
        .get('/h5')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });
  });

  // 测试统计数据API
  describe('Statistics API', () => {
    it('should return 200 OK and valid statistics data', (done) => {
      request(app)
        .get('/api/statistics')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          // 验证返回的数据结构
          expect(res.body).to.have.property('total_codes');
          expect(res.body).to.have.property('used_codes');
          expect(res.body).to.have.property('total_redemptions');
          expect(res.body).to.have.property('shipped_redemptions');
          
          done();
        });
    });
  });

  // 测试兑换码验证API
  describe('Code Verification API', () => {
    it('should return 400 for invalid code', (done) => {
      request(app)
        .get('/api/verify-code/invalid-code')
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });
  });
});