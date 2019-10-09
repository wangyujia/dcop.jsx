/// js/test/test_fib.js



/*
 dump-script.js: -p, -f, main.js, -e, test_fib
*/
function test_fib() {
    return test(
        'test_fib',
        'test_fib2'
    );
}



TEST_CASE('test_fib', function() {
    printlog('fib_norm_main start');
    fib_norm_main(20);
    printlog('fib_norm_main end');
    printlog('fib_tail_main start');
    fib_tail_main(20);
    printlog('fib_tail_main end');
});



TEST_CASE('test_fib2', function() {
    var fib = [0, 1];
    for (var i = 2; i < 10000; i++) {
        fib[i] = fib[i-2] + fib[i-1];
    }
    printlog("fib.length: " + fib.length);
});



function fib_norm_main(n, loop) {
    if (typeof(loop) == "undefined")
        return printlog('fib_norm(' + n + '):' + fib_norm(n));
    for (i = 0; i < n; i++) {
        printlog(fib_norm(i));
    }
}


function fib_tail_main(n, loop) {
    if (typeof(loop) == "undefined")
        return printlog('fib_tail(' + n + '):' + fib_tail(n));
    for (i = 0; i < n; i++) {
        printlog(fib_tail(i));
    }
}


function fib_norm(n) {
    if (n < 2) return n;
    return fib_norm(n - 1) + fib_norm(n - 2);
}


function fib_tail(n, a, b) {
    if (typeof(a) == "undefined") a = 0;
    if (typeof(b) == "undefined") b = 1;
    return (n === 0)? a : fib_tail(n - 1, b, a + b);
}

