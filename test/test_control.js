/// js/test/test_control.js


load('js/app/iot/control.js');


/*
dump-script.js: -p, -f, main.js, -e, test_control
*/
function test_control() {
    return test(
        'test_control'
    );
}


TEST_CASE('test_control', function() {
    control_command('control-fengji', {
        process: function(o, data) {
            return true;
        },
        result: function(o, data) {
            data.state = 1;
            return true;
        },
        waittime: 3000
    });
    control_send(function(ch, ip, port, proto, s) {
        printlog('[control send] ch:' + ch + ' str:' + s);
        return true;
    });
    var o = {
        type: "request",
        command: "control-fengji",
        arg: {
            "state": 1
        },
        index: 101
    };
    var s = Duktape.enc('jc', o);
    var p = bytes.create(s);
    control_pack_recv(p.buf, p.len, null, 1, "1.1.1.1", 1000, "udp", "all");
    timer_tick(1000);
    timer_tick(1000);
    timer_tick(1000);
    timer_tick(1000);
});

