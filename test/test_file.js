/// js/test/test_file.js



/*
dump-script.js: -p, -f, main.js, -e, test_file
*/
function test_file() {
    return test(
        'test_file_save_str',
        'test_file_load_str'
    );
}


TEST_CASE('test_file_save_str', function() {
    printlog('typeof files: ' + typeof(files));
    print_obj_member(files, printlog);
    if (files.exists('test_file_str.txt')) {
        printlog('"test_file_str.txt" exists!');
        files.remove('test_file_str.txt');
    }
    else {
        printlog('"test_file_str.txt" not exists!');
    }
    files.save('test_file_str.txt', 'hello world! \r\n  hehehe.');
});


TEST_CASE('test_file_load_str', function() {
    var src = 'test_file_str.txt';
    var len = files.size(src);
    var buf = bytes.alloc(len);
    files.load(src, buf, len);
    print(bytes.str(buf, len) + '\r\n');
    bytes.free(buf);
});


TEST_CASE('test_gis_coor1', function() {
    var src = 'test_gis_coor1.txt';
    var dst = 'test_gis_coor1.json';
    var len = files.size(src);
    var buf = bytes.alloc(len);
    var r = files.load(src, buf, len);
    printlog('load file:' + src + ' rc:' + r + ' len:' + len);
    var o = '[\r\n';
    var s = bytes.str(buf, len);
    var a = s.split(/[;|]/);
    for (var i in a) {
        var xy = a[i].split(',');
        o += '    [' + xy[1] + ', ' + xy[0] + ']' +
            ((i != (a.length-1))? ',':'') + '\r\n';
    }
    o += ']';
    files.remove(dst);
    r = files.save(dst, o);
    printlog('save file:' + dst + ' rc:' + r + ' len:' + o.length);
    bytes.free(buf);
});


TEST_CASE('test_gis_coor2', function() {
    var src = 'test_gis_coor2.txt';
    var dst = 'test_gis_coor2.json';
    var len = files.size(src);
    var buf = bytes.alloc(len);
    var r = files.load(src, buf, len);
    printlog('load file:' + src + ' rc:' + r + ' len:' + len);
    var o = '[\r\n';
    var s = bytes.str(buf, len);
    var a = s.split(',');
    for (var i in a) {
        if ((i % 2) == 0) continue;
        o += '    [' + a[i] + ', ' + a[i-1] + ']' +
            ((i != (a.length-1))? ',':'') + '\r\n';
    }
    o += ']';
    files.remove(dst);
    var r = files.save(dst, o);
    printlog('save file:' + dst + ' rc:' + r + ' len:' + o.length);
    bytes.free(buf);
});


/*
dump-script.js: -p, -f, main.js, -e, test, -a, test_gis_coor3
*/
var jsonp_604062_ = null;
TEST_CASE('test_gis_coor3', function() {
    var save = function(s, file) {
        var o = 'var data_show = ';
        o += s;
        o += ';\r\n';
        o += 'if (this.map) map.setView(data_show.center, data_show.level);\r\n';
        o += 'if (this.on_data_show) on_data_show(data_show.lines);\r\n';
        files.remove(file);
        var r = files.save(file, o);
        printlog("save file '" + file + "' rc:" + r + ' len:' + o.length);
    };
    var count = 0;
    var total = '[\r\n';
    var convert = function(s) {
        count++;
        if (count > 1) total += ',\r\n';
        total += '    /// ' + count + '\r\n';
        total += '    [\r\n';
        var a = s.split(',');
        for (var i in a) {
            if ((i % 2) == 0) continue;
            if (i > 1) total += ',\r\n';
            total += '        [' + a[i] + ', ' + a[i-1] + ']';
        }
        total += '\r\n    ]';
    };
    jsonp_604062_ = function(o) {
        var n = 0;
        var s = '';
        var paths = o.data.path_list[1].path;
        for (var i in paths) {
            var segments = paths[i].segments;
            for (var j in segments) {
                if (s.length > 0) s += ',';
                s += segments[j].coor.replace('[', '').replace(']','');
                if (s.length >= 20000) {
                    convert(s);
                    s = '';
                }
            }
        }
    }
    
    printlog("in_gb2312:" + in_gb2312());
    printlog("out_gb2312:" + out_gb2312());
    load('../../../gis/app/demeng/main_area_demeng.js', 'utf8');
    printlog("in_gb2312:" + in_gb2312());
    printlog("out_gb2312:" + out_gb2312());

    total += '\r\n]';
    save(total, '../../../gis/app/demeng/line.js');
});

/*
dump-script.js: -p, -f, main.js, -e, test, -a, test_gis_coor4
*/
var on_data_show = null;
TEST_CASE('test_gis_coor4', function() {
    var save = function(s, file) {
        var o = 'var data_show = ';
        o += s;
        o += ';\r\n';
        o += 'if (this.map) map.setView(data_show.center, data_show.level);\r\n';
        o += 'if (this.on_data_show) on_data_show(data_show.lines);\r\n';
        files.remove(file);
        var r = files.save(file, o);
        printlog("save file '" + file + "' rc:" + r + ' len:' + o.length);
    };
    var total = '[\r\n';
    on_data_show = function(n, data) {
        if (n > 1) total += ',\r\n';
        total += '    /// ' + n + '\r\n';
        total += '    [\r\n';
        for (var i = 0; i < data.length; ++i) {
            if (i > 0) total += ',\r\n';
            total += '        ' + Duktape.enc('jc', data[i]);
        }
        total += '\r\n    ]';
    };
    for (var i = 0; i < 20; ++i) {
        load('../../../gis/app/ehan/main_area_ehan' + (i+1) + '.js', 'utf8');
    }
    total += '\r\n]';
    save(total, '../../../gis/app/ehan/line.js');
});


/*
dump-script.js: -p, -f, main.js, -e, test, -a, test_curdir
*/
TEST_CASE('test_curdir', function() {
    var s = files.dircur();
    printlog('cur dir: ' + s);
});
