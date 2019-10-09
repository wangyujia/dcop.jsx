/// js/test/test_httpc.js



load('js/app/http/client.js');



/*
dump-script.js: -p, -f, main.js, -e, test_httpc
*/
function test_httpc() {
    return test(
        'test_httpc_length',
        'test_httpc_length2',
        'test_httpc_length3',
        'test_httpc_chunked',
        'test_httpc_chunked2',
        'test_httpc_identity'
    );
}


TEST_CASE('test_httpc_length', function() {
    printlog('[httpclient] js loaded!');
    var hpc = httpclient();
    printlog('[httclient] obj created!');
    var rsp = 'HTTP/1.1 200\r\n' + 
        'Content-Type: text/plain\r\n' + 
        'Content-Length: 28\r\n' + 
        '\r\n' + 
        'This is content length data.';
    var buf = bytes.alloc(rsp);
    var len = rsp.length;
    // bytes.dump(buf, len, printlog);
    var ret = hpc.recv(buf, len);
    bytes.free(buf);
    printlog('[httpclient] recv ret: ' + ret);
    printlog('[httpclient] recv code: ' + hpc.code());
    printlog('[httpclient] recv data: ' + hpc.data());
    if (hpc.data().length != 28) return false;
});



TEST_CASE('test_httpc_length2', function() {
    printlog('[httpclient] js loaded!');
    var hpc = httpclient();
    printlog('[httclient] obj created!');
    var rsp = 'HTTP/1.1 200\r\n' + 
        'Content-Type: text/plain\r\n' + 
        'Content-Length: 0\r\n' + 
        '\r\n';
    var buf = bytes.alloc(rsp);
    var len = rsp.length;
    var ret = hpc.recv(buf, len);
    bytes.free(buf);
    printlog('[httpclient] recv ret: ' + ret);
    printlog('[httpclient] recv code: ' + hpc.code());
    printlog('[httpclient] recv data: ' + hpc.data());
    if (hpc.data().length != 0) return false;
});



TEST_CASE('test_httpc_length3', function() {
    printlog('[httpclient] js loaded!');
    var hpc = httpclient();
    printlog('[httclient] obj created!');
    var rsp = 'HTTP/1.1 200\r\n' + 
        'Content-Type: text/plain;charset=UTF-8\r\n' + 
        'Content-Length: 476\r\n' + 
        'Date: Wed, 08 Aug 2018 06:23:42 GMT\r\n' + 
        '\r\n' + 
        '{"state":200,"message":null,"data":{"proCode":"XjAzxv",' + 
        '"sensorConfigs":[{"id":"8c2c8097f65d40798b6208d1547a9183",' + 
        '"sensorId":"970fb4d3e1aa4dcd92f9ed1b1398ca93","configItems":' + 
        '"{\\"uuid\\":\\"8c2c8097f65d40798b6208d1547a9183\\",\\"ip\\":' + 
        '\\"127.0.0.1\\", \\"port\\":\\"8080\\", \\"protocol\\":\\"tcp\\", ' + 
        '\\"type\\":\\"access\\", \\"path\\":\\"/tempreture\\", \\"file\\":' + 
        '\\"Z:\\\\ideaProjects\\\\test.mdb\\"}","createTime":1533631055000,' + 
        '"updateTime":1533632111000,"remark":null,"version":"1.0"}],' + 
        '"version":"1.0"}}';
    var buf = bytes.alloc(rsp);
    var len = rsp.length;
    var ret = hpc.recv(buf, len);
    bytes.free(buf);
    printlog('[httpclient] recv ret: ' + ret);
    printlog('[httpclient] recv code: ' + hpc.code());
    printlog('[httpclient] recv data: ' + hpc.data());
    if (hpc.data().length != 476) return false;
});



TEST_CASE('test_httpc_chunked', function() {
    printlog('[httpclient] js loaded!');
    var hpc = httpclient();
    printlog('[httclient] obj created!');
    var rsp = 'HTTP/1.1 200\r\n' + 
        'Content-Type: text/plain\r\n' + 
        'Transfer-Encoding: chunked\r\n' + 
        '\r\n' + 
        '23\r\n' + 
        'This is the data in the first chunk\r\n' + 
        '1A\r\n' + 
        'and this is the second one\r\n' + 
        '3\r\n' + 
        'con\r\n' + 
        '8\r\n' + 
        'sequence\r\n' + 
        '0\r\n' + 
        '\r\n';
    var buf = bytes.alloc(rsp);
    var len = rsp.length;
    var ret = hpc.recv(buf, len);
    bytes.free(buf);
    printlog('[httpclient] recv ret: ' + ret);
    printlog('[httpclient] recv code: ' + hpc.code());
    printlog('[httpclient] recv data: ' + hpc.data());
    if (hpc.data().length != (0x23+0x1A+0x3+0x8)) return false;
});



TEST_CASE('test_httpc_chunked2', function() {
    printlog('[httpclient] js loaded!');
    var hpc = httpclient();
    printlog('[httclient] obj created!');
    var rsp = 'HTTP/1.1 200\r\n' + 
        'Content-Type: text/plain\r\n' + 
        'Transfer-Encoding: chunked\r\n' + 
        '\r\n' + 
        '23\r\n' + 
        'This is the data in the first chunk\r\n' + 
        '1A\r\n' + 
        'and this is the second one\r\n' + 
        '3\r\n' + 
        'con\r\n' + 
        '8\r\n' + 
        'sequence\r\n';
    var buf = bytes.alloc(rsp);
    var len = rsp.length;
    var ret = hpc.recv(buf, len);
    printlog('[httpclient] recv ret1: ' + ret);
    bytes.free(buf);
    rsp = '0\r\n\r\n';
    buf = bytes.alloc(rsp);
    len = rsp.length;
    ret = hpc.recv(buf, len);
    bytes.free(buf);
    printlog('[httpclient] recv ret2: ' + ret);
    printlog('[httpclient] recv code: ' + hpc.code());
    printlog('[httpclient] recv data: ' + hpc.data());
    if (hpc.data().length != (0x23+0x1A+0x3+0x8)) return false;
});



TEST_CASE('test_httpc_identity', function() {
    printlog('[httpclient] js loaded!');
    var hpc = httpclient();
    printlog('[httclient] obj created!');
    var rsp = 'HTTP/1.1 200\r\n' + 
        'Content-Type: text/plain\r\n' + 
        'Transfer-Encoding: identity\r\n' + 
        '\r\n' + 
        'This is identity data.';
    var buf = bytes.alloc(rsp);
    var len = rsp.length;
    var ret = hpc.recv(buf, len);
    bytes.free(buf);
    printlog('[httpclient] recv ret: ' + ret);
    printlog('[httpclient] recv code: ' + hpc.code());
    printlog('[httpclient] recv data: ' + hpc.data());
    if (hpc.data().length != 22) return false;
});


