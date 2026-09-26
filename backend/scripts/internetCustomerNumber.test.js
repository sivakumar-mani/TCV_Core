const test=require('node:test'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {internetCustomerNumberSql}=require('../controller/internetCustomerNumber');
test('customer numbers preserve assigned numbers and continue 564, 565, 566 for new customers',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  db.function('regexp',(pattern,value)=>new RegExp(pattern).test(String(value))?1:0);
  db.function('LPAD',(value,length,pad)=>String(value).padStart(length,pad));
  db.exec('CREATE TABLE customers(legacy_customer_no TEXT,customer_code INT)');
  const insert=db.prepare('INSERT INTO customers VALUES(?,?)');
  for(const [legacy,code] of [['563',2001],[null,2464],['',2465],['  ',2466],['7',2005],['1234',2006],[null,999],['123',2467],[null,2468],[null,2899],[null,2900]])insert.run(legacy,code);
  const numbers=db.prepare(`SELECT ${internetCustomerNumberSql('c')} AS number FROM customers c`).all().map(r=>r.number);
  assert.deepEqual(numbers,['563','564','565','566','007','1234','999','123','568','999','1000']);
  assert.equal(db.prepare('SELECT customer_code FROM customers WHERE customer_code=2464').get().customer_code,2464);
 } finally {db.close();}
});
