/// js/app/iot/test/test_device.js
/**
 * ≤‚ ‘…Ë±∏
 */


/*
dump-iot.edge:test,ctrl_kyj_open
dump-iot.edge:test,ctrl_kyj_close
dump-iot.edge:test,ctrl_fj_open
dump-iot.edge:test,ctrl_fj_close
*/
IOT_TEST_CASE('ctrl_kyj_open', function() {
    var o = {
        arg: {
            uuid: "TgsnTc-KongyajiCtrl-0001",
            state: "open",
            wait: 2000
        }
    };
    var data = {};
    print_obj_member(o, printlog, "device_control command");
    var r = device_control_proc(o, data, "device_control");
    print_obj_member(data, printlog, "device_control process:" + r);
});
IOT_TEST_CASE('ctrl_kyj_close', function() {
    var o = {
        arg: {
            uuid: "TgsnTc-KongyajiCtrl-0001",
            state: "close",
            wait: 2000
        }
    };
    var data = {};
    print_obj_member(o, printlog, "device_control command");
    var r = device_control_proc(o, data, "device_control");
    print_obj_member(data, printlog, "device_control process:" + r);
});



IOT_TEST_CASE('ctrl_fj_open', function() {
    var o = {
        arg: {
            uuid: "TgsnTc-FengjiCtrl-0001",
            state: "open",
            wait: 2000
        }
    };
    var data = {};
    print_obj_member(o, printlog, "device_control command");
    var r = device_control_proc(o, data, "device_control");
    print_obj_member(data, printlog, "device_control process:" + r);
});
IOT_TEST_CASE('ctrl_fj_close', function() {
    var o = {
        arg: {
            uuid: "TgsnTc-FengjiCtrl-0001",
            state: "close",
            wait: 2000
        }
    };
    var data = {};
    print_obj_member(o, printlog, "device_control command");
    var r = device_control_proc(o, data, "device_control");
    print_obj_member(data, printlog, "device_control process:" + r);
});

