/// js/test/test_dll.js



/*
dump-script.js: -p, -f, main.js, -e, test_dll
*/
function test_dll() {
    return test(
        'test_dll_create',
        'test_dll_led',
        'test_dll_ado'
    );
}



TEST_CASE('test_dll_create', function() {
    var dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
});


TEST_CASE('test_dll_led', function() {
    printlog('dcop os:' + dcop.os);
    if (dcop.os != "windows") return;
    var dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
    var rc = dll.load('../../../../hdc/edge/led/led/Release/led.dll');
    printlog('load led dll rc:' + rc);
    if (rc != 0) return false;
    print_obj_member(dll, printlog, 'dll load');

    var create = function() {
    var rc = dll.Hd_CreateScreen(64, 32, 1, 1, 0);
        printlog('Hd_CreateScreen rc:' + rc);
    };
    var adding = function() {
        var pid = dll.Hd_AddProgram(5);
        printlog('Hd_AddProgram pid:' + pid);
        var aid = dll.Hd_AddArea(pid, 0, 0, 64, 32, 5);
        printlog('Hd_AddArea aid:' + aid);
        var text = "你好";
        var color = dll.Hd_GetColor(255, 0, 0);
        var background = 0;
        var style = 4 | 0x0100 | 0x0200;
        var font = "Arial";
        var size = 24;
        var showEffect = 0;
        var showSpeed = 25;
        var clearType = 201;
        var stayTime = 3;
        var tid = dll.Hd_AddSimpleTextAreaItem(aid, text, color, background, 
            style, font, size, showEffect, showSpeed, clearType, stayTime);
        printlog('Hd_AddSimpleTextAreaItem tid:' + tid);
        var rc = dll.Hd_SendScreen(0, "127.0.0.1");
        printlog('Hd_SendScreen rc:' + rc);
    };
    var destroy = function() {
        var rc = dll.Cmd_ClearScreen(0, "127.0.0.1");
        printlog('Cmd_ClearScreen rc:' + rc);
    };
    create();
    adding();
    adding();
    create();
    adding();
});

TEST_CASE('test_dll_ado', function() {
    printlog('dcop os:' + dcop.os);
    if (dcop.os != "windows") return;
    var dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
    var rc = dll.load('AdoProxy.dll');
    printlog('load ado dll rc:' + rc);
    if (rc != 0) return false;
    print_obj_member(dll, printlog, 'dll load');

    // var out = dll.test([{name:"张三",age:18},{name:"李四",age:21}]);
    var out = dll.test([]);
    print_obj_member(out, printlog, 'dll test out');

    var str = Duktape.enc('jc', out);
    printlog('str:' + str);
});

/*
 dump-script.js: -p, -f, main.js, -e, test, -a, test_dll_haface
*/
TEST_CASE('test_dll_haface', function() {
    var dll = dlls.create();
    dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
    var rc = dll.load('haface.dll');
    printlog('load dll rc:' + rc);
    if (rc != 0) return false;
    print_obj_member(dll, printlog, 'dll load');

    dll.HA_Init();
    dll.HA_SetNotifyConnected(1);
    dll.HA_InitFaceModel(null);
    dll.HA_RegConnectEventCb(
        function(cam, ip, port, event) {
            printlog('ConnectEventCb cam: ' + cam + ' ip: ' + ip + ' port: ' + port + ' event: ' + event);
        }
    );

    var cam = dll.HA_Connect("100.10.1.180", 9527, "admin", "admin");
    printlog('Connect cam: ' + cam);

    dll.HA_RegFaceRecoCb(cam, function(cam, name, id, role, matched) {
        printlog('getting_face cam: ' + cam + ' name: ' + name + ' id: ' + id + 
            ' role: ' + role + ' matched: ' + matched);
    });

});

/*
 dump-script.js: -p, -f, main.js, -e, test, -a, test_dll_haik
 dump-script.js: -e, test, -a, test_dll_haik_end
*/
TEST_CASE('test_dll_haik', function() {
    var dir = files.dircur() + files.dirsplit();
    printlog("cur dir: " + dir);

    var dll = dlls.create();
    dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
    var rc = dll.load('haik.dll');
    printlog('load dll rc:' + rc);
    if (rc != 0) return false;
    print_obj_member(dll, printlog, 'dll load');

    var rc = dll.NET_DVR_Init();
    printlog('NET_DVR_Init rc:' + rc);
    var rc = dll.NET_DVR_SetConnectTime(2000, 1);
    printlog('NET_DVR_SetConnectTime rc:' + rc);
    var rc = dll.NET_DVR_SetReconnect(10000, true);
    printlog('NET_DVR_SetReconnect rc:' + rc);

    var fail = function(info, id) {
        var err = dll.NET_DVR_GetLastError();
        var msg = dll.NET_DVR_GetErrorMsg(err);
        printlog(info + ' fail(' + err + '): ' + msg);
        if (typeof(id) != "undefined") dll.NET_DVR_Logout(id);
        dll.NET_DVR_Cleanup();
        return false;
    }

    var len = dll.NET_DVR_DEVICEINFO_V40_LEN();
    var out = bytes.create(len);
    var id = dll.NET_DVR_Login_V40("100.10.1.224", 8000, "admin", "hik12345+", out.buf);
    bytes.dump(out.buf, out.len);
    printlog('NET_DVR_Login_V40 id: ' + id);
    if (id < 0) return fail("NET_DVR_Login_V40");

    // var handle = dll.NET_DVR_RealPlay_V40(id, 1, 0, 0, 0, 0);
    var handle = dll.NET_DVR_RealPlay_V40(id, 1, 0, 4, 0, 1);
    if (handle < 0) return fail("NET_DVR_RealPlay_V40", id);

    var rc = dll.NET_DVR_SaveRealData(handle, dir + "haik.mp4");
    if (rc <= 0) return fail("NET_DVR_SaveRealData", id);

    TEST_CASE('test_dll_haik_end', function() {
        dll.NET_DVR_StopSaveRealData(handle);
        dll.NET_DVR_StopRealPlay(handle);
        dll.NET_DVR_Logout(id);
        dll.NET_DVR_Cleanup();
        printlog('real data stopped! id:' + id);
    });
});


/*
 dump-script.js: -p, -f, main.js, -e, test, -a, test_jsx_dlls
 dump-script.js: -p, -f, main.js, -e, __js_gc
 */
TEST_CASE('test_jsx_dlls', function() {
    var dir = files.dircur() + files.dirsplit();
    printlog("cur dir: " + dir);

    var dll = dlls.create();
    dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
    var rc = dll.load('test_jsx_dlls.dll');
    printlog('load dll rc:' + rc);
    if (rc != 0) return false;
    print_obj_member(dll, printlog, 'dll load');

    printlog("reg_test_cb begin");
    dll.reg_test_cb(function(info) {
        printlog("js be called: " + info);
    });
    printlog("reg_test_cb end");
});


/*
 dump-script.js: -p, -f, main.js, -e, test, -a, test_dll_mci
 dump-script.js: -e, main.js, -a, test_dll_mci_stop
 */
TEST_CASE('test_dll_mci', function() {
    var dll = dlls.create();
    dll = dlls.create();
    printlog('dll create: ' + dll + ' ' + typeof(dll));
    print_obj_member(dll, printlog, 'dll create');
    if (!dll.ptr) return false;
    var rc = dll.load('mci.dll');
    printlog('load dll rc:' + rc);
    if (rc != 0) return false;
    print_obj_member(dll, printlog, 'dll load');

    dll.mciSendString("close .\\告警.wav", 0, 0);
    var r = dll.mciSendString("open .\\告警.wav alias .\\告警.wav type mpegvideo", 0, 0);
    printlog("mciSendString open r:" + r);
    var r = dll.mciSendString("play .\\告警.wav repeat", 0, 0);
    printlog("mciSendString play r:" + r);

    TEST_CASE('test_dll_mci_stop', function() {
        dll.mciSendString("stop .\\告警.wav", 0, 0);
        dll.mciSendString("close .\\告警.wav", 0, 0);
    });
});

