/// js/test/test_gis.js


var gis_path = '';


/*
dump-script.js: -p, -f, main.js, -e, gis_road, -a, path
dump-script.js: -p, -f, main.js, -e, gis_road, -a, ../../../gis
dump-script.js: -p, -f, main.js, -e, gis_road, -a, ../../../gis/app/chengyi
*/
function gis_road(path) {
    gis_path = path;
    if (!gis_path) gis_path = '';
    return test(
        'test_gis_lbs_amap'
    );
}


/**
 * 请打开 'https://lbs.amap.com/console/show/tools' 进入添加标注页，
 * 标注线路完成并缩放到合适位置，点击'获取代码'按钮，然后拷贝弹出窗口代码中
 * 的全局变量(有center、level、features等)到gis服务的根目录下，命名为：
 * 'gaode.js'，然后执行用例命令。
 */
TEST_CASE('test_gis_lbs_amap', function() {
    if (!gis_path) gis_path = '';
    if ( gis_path) {
        var last_char = gis_path.charAt(gis_path.length - 1);
        if (last_char != '/' && last_char != '\\') {
            gis_path += (dcop.os == "windows")? '\\' : '/';
        }
    }
    
    load(gis_path + 'gaode.js', 'utf8');
    if (!this.features) {
        printlog(gis_path + 'gaode.js no "features"!');
        return;
    }

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
    var total = '{\r\n' + 
        '    "center": [' + center.lat + ',' + center.lng + '],\r\n' + 
        '    "level": ' + level + ',\r\n' + 
        '    "lines": [\r\n';
    
    for (var i in features) {
        var node = features[i];
        if (!node) continue;
        var lnglat = node.lnglat;
        if (!lnglat) continue;

        count++;
        if (count > 1) total += ',\r\n';
        total += '        /// ' + count + '\r\n';
        total += '        [\r\n';
        for (var j in lnglat) {
            var lng = lnglat[j].lng;
            var lat = lnglat[j].lat;
            if (j > 0) total += ',\r\n';
            total += '            [' + lat + ', ' + lng + ']';
        }
        total += '\r\n        ]';
    }

    total += '\r\n    ]\r\n}';
    save(total, gis_path + 'line.js');
});

