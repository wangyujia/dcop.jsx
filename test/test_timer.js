/// js/test/test_file.js



/*
dump-script.js: -p, -f, main.js, -e, test_timer
*/
function test_timer() {
    return test(
        'test_timer_main',
        'test_timer_pulse'
    );
}


TEST_CASE('test_timer_main', function() {

    timer_add(function(id) {
        printlog("timer" + id + " timeout!");
        print_obj_member(this, printlog);
    }, 3000);

    var timer2_count = 0;
    timer_add(function(id) {
        printlog("timer" + id + " timeout!");
        if (++timer2_count < 5) return 1000;
    }, 1000);

    var last_timer;
    for (var i = 0; i < 10; ++i) {
        printlog("--- tick --- " + (i+1));
        timer_tick(1000);

        if (i == 5) {
            var middle_timer = timer_add(function(id) {
                printlog("middle timer" + middle_timer + "|" + id + " timeout!");
            }, 2000, true);
        }

        if (i == 6) {
            last_timer = timer_add(function() {
                printlog("last timer" + last_timer + " timeout!");
            });
        } else if (i == 8) {
            printlog("last timer" + last_timer + " set start after 1000");
            timer_set(last_timer, 1000);
        }
    }

    print_obj_member(timer_all(), printlog);
    timer_clr();
});


TEST_CASE('test_timer_pulse', function() {
    timer_add(function() {
        if (this.count == 1) {
            /// 高电平 + 持续1秒
            printlog("[open]");
            return 1000;
        }
        else {
            /// 低电平 + 结束定时器
            printlog("[close]");
        }
    }, 1000);
    for (var i = 0; i < 10; ++i) {
        printlog("--- tick --- " + (i+1));
        timer_tick(1000);
    }

    print_obj_member(timer_all(), printlog);
    timer_clr();
});
