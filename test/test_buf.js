/// js/test/test_buf.js



/*
dump-script.js: -p, -f, main.js, -e, test_buf
*/
function test_buf() {
    return test(
        'test_buf_zero', 
        'test_buf_alloc', 
        'test_buf_append', 
        'test_buf_create', 
        'test_buf_create2',
        'test_buf_create_free',
        'test_buf_create_append',
        'test_buf_create_append2',
        'test_buf_dump',
        'test_buf_dump2',
        'test_buf_shift',
        'test_buf_crc16'
    );
}



TEST_CASE('test_buf_zero', function() {
    var buf = bytes.zero();
    printlog('zero bytes: ' + buf + ' ' + typeof(buf));
    print_obj_member(buf, printlog, 'zero bytes');
    if (!bytes.zero(buf)) return false;
});


TEST_CASE('test_buf_alloc', function() {
    var buf = bytes.alloc(100);
    printlog('alloc bytes: ' + buf + ' ' + typeof(buf));
    print_obj_member(buf, printlog, 'alloc bytes');
    if (bytes.zero(buf)) return false;
    bytes.free(buf);
});


TEST_CASE('test_buf_append', function() {
    var buf = bytes.append(bytes.zero(), 0, 'abcdefg');
    printlog('append bytes: ' + buf + ' ' + typeof(buf));
    print_obj_member(buf, printlog, 'append bytes');
    bytes.dump(buf, 7, printlog);
    if (bytes.zero(buf)) return false;
    bytes.free(buf);
});


TEST_CASE('test_buf_create', function() {
    var obj = bytes.create(100);
    printlog('create bytes' + obj + ' ' + typeof(obj));
    printlog('create bytes buf: ' + obj.buf + ' ' + typeof(obj.buf));
    printlog('create bytes len: ' + obj.len + ' ' + typeof(obj.len));
    print_obj_member(obj, printlog, 'create bytes');
    bytes.dump(obj.buf, obj.len, printlog);
    if (bytes.zero(obj.buf)) return false;
});


TEST_CASE('test_buf_create2', function() {
    var testfunc = function(len) {
        return bytes.create(len);
    }
    var obj = testfunc(100);
    print_obj_member(obj, printlog, 'create bytes');
    bytes.dump(obj.buf, obj.len, printlog);
    if (bytes.zero(obj.buf)) return false;
});


TEST_CASE('test_buf_create_free', function() {
    var testfunc = function(len) {
        return bytes.create(len);
    }
    var obj = testfunc(100);
    print_obj_member(obj, printlog, 'create bytes');
    bytes.dump(obj.buf, obj.len, printlog);
    if (bytes.zero(obj.buf)) return false;
    var rc = obj.free();
    print_obj_member(rc, printlog, 'obj.free ret');
});


TEST_CASE('test_buf_create_append', function() {
    var obj1 = bytes.create(16);
    print_obj_member(obj1, printlog, 'create bytes1');
    var obj2 = bytes.create(16);
    print_obj_member(obj2, printlog, 'create bytes2');
    var rc = obj1.append(obj2.buf, obj2.len);
    print_obj_member(rc, printlog, 'obj.append ret');
    print_obj_member(obj1, printlog, 'append bytes');
    bytes.dump(obj1.buf, obj1.len, printlog);
    if (bytes.zero(obj1.buf)) return false;
});


TEST_CASE('test_buf_create_append2', function() {
    var obj1 = bytes.create(16);
    print_obj_member(obj1, printlog, 'create bytes1');
    var obj2 = bytes.create(16);
    print_obj_member(obj2, printlog, 'create bytes2');
    obj1.append(obj2);
    print_obj_member(obj1, printlog, 'append bytes');
    bytes.dump(obj1.buf, obj1.len, printlog);
});


TEST_CASE('test_buf_dump', function() {
    var obj = bytes.create('hello1');
    print_obj_member(obj, printlog, 'create bytes');
    bytes.dump(obj.buf, obj.len, printlog);
    bytes.dump('hello2', printlog);
});


TEST_CASE('test_buf_dump2', function() {
    var buf = bytes.alloc('world');
    bytes.dump(buf, 6, printlog);
    bytes.free(buf);
});


TEST_CASE('test_buf_shift', function() {
    var buf = bytes.alloc('world');
    bytes.dump(bytes.shift(buf, 6, 2), 4, printlog);
    bytes.free(buf);
});


TEST_CASE('test_buf_crc16', function() {
    var len = 8;
    var buf = bytes.alloc(len);
    bytes.byte(buf, len, 0, 0x02);
    bytes.byte(buf, len, 1, 0x03);
    bytes.byte(buf, len, 5, 0x01);
    var crc = bytes.crc16(buf, len-2);
    printlog('0 crc16: ' + crc);
    bytes.crc16(buf, len, len-2, crc);
    crc = bytes.crc16(buf, len);
    printlog('1 crc16: ' + crc);
    bytes.dump(buf, len, printlog);
    bytes.free(buf);
});
