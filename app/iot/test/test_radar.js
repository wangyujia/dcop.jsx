/// js/app/iot/test/test_radar.js
/**
 * 测试雷达设备
 */


load('js/app/gis/coor.js');
load('js/app/iot/edge/radar.js');


IOT_TEST_CASE('radar_recv', function() {
    var o = bytes.create(31);
    bytes.dump(o.buf, o.len);
    bytes.set(o.buf, o.len, 0, 
        0xca, 0xcb, 0xcc, 0xcd,
        0x05, 0x01, 0x08, 0x00, 0x01, 0x7F, 0x29, 0x00, 0x32, 0x01, 0x06,
        0x05, 0x10, 0x08, 0x00, 0x2A, 0x00, 0x3B, 0xA7, 0xFB, 0xE9, 0x0C,
        0x00,
        0xea, 0xeb, 0xec, 0xed
        );
    bytes.dump(o.buf, o.len);
    var check = radar_ruda_checksum(o.buf, o.len - 5, 4);
    printlog("check: " + check);
    bytes.byte(o.buf, o.len, 26, check);
    bytes.dump(o.buf, o.len);
    radar_ruda_recv(o.buf, o.len, null, {
        ch: 1,
        dump: "radar"
    });
});


IOT_TEST_CASE('coor_rotate', function() {
    var f = function(x, y, angle) {
        var o = coor_getPointRotate({x:x,y:y}, angle);
        print_obj_member(o, printlog, "rotate");
    };
    f(1, 0, 45);
    f(1, 1, 45);
    f(1, 0, 90);
    f(0, 1, 45);
    f(1, 0, 135);
});


IOT_TEST_CASE('coor_angle', function() {
    var f = function(x1, y1, x2, y2, check) {
        var angle = coor_getLineAngle({x:x1,y:y1}, {x:x2,y:y2});
        printlog("angle: " + angle + " | " + check);
        return angle;
    };
    f( 2,-1, 2, 2, 90 );
    f( 2, 2, 2,-1, 270);
    f(-1,-1, 2, 2, 45 );
    f( 2, 2,-1,-1, 225);
    f( 1,-1,-2, 2, 135);
    f(-1, 1, 2,-2, 315);

    var a = function(x, y) {
        var angle  = f(0, 0, x, y);
        var radian = angle * Math.PI / 180;
        var length = Math.sqrt(x*x + y*y);
        printlog("(" + x + "," + y + ") length: " + length + " cos: " + length * Math.cos(radian));
        printlog("(" + x + "," + y + ") length: " + length + " sin: " + length * Math.sin(radian));
    };
    a( 3, 4);
    a(-3, 4);
    a( 3,-4);
    a(-3,-4);
});


IOT_TEST_CASE('coor_rel', function() {
    var rel = function(x1, y1, x2, y2, x3, y3) {
        printlog("-----------------------------------");
        var c = {x:x1,y:y1};
        var l = coor_getLinePara(c, {x:x2,y:y2});
        print_obj_member(l, printlog, "coor_getLinePara({" + c.x + "," + c.y + "}, {" + x2 + "," + y2 + "})");
        var o = coor_getLineRelative(c, l, {x:x3,y:y3});
        print_obj_member(o, printlog, "coor_getLineRelative(..., {" + x3 + "," + y3 + "})");
        return o;
    };

    /*
    rel(0, 0, 1, 1, 0, 1);
    rel(0, 0, 1, 1, 1, 0);
    rel(0, 0, 1, 1, 0,-1);
    rel(0, 0, 1, 1,-1, 0);

    var p = rel(1, 1, 5, 4,-2, 5);
    var c = {x:1,y:1};
    var l = coor_getLinePara(c, {x:5,y:4});
    var q = coor_getLineAbsolute(c, l.a, p);
    print_obj_member(q, printlog, "coor_getLineAbsolute(-2,5) ");

    rel(0, 1.5, 5, 1.5,   1, 2.5);
    rel(0, 1.5, 5, 1.5,   1, 0.5);
    rel(1, 0,   1,   5, 0.5, 1.5);
    rel(1, 0,   1,   5, 1.5, 1.5);
    */

    var abs = function(x, y) {
        var p = rel(0, 1.5, 5, 1.5,   1, 2.5);
        var a = coor_getLineAbsolute(p, -30, {x:x,y:0-y});
        print_obj_member(a, printlog, "coor_getLineAbsolute1(..., {" + x + "," + (0-y) + "})");
        var b = coor_getLineAbsolute({x:0,y:1.5}, 0, a);
        print_obj_member(b, printlog, "coor_getLineAbsolute2(..., {" + a.x + "," + a.y + "})");
    };

    abs(22.336,  -4.16);
    abs(  4.16, -0.064);
});

IOT_TEST_CASE('fence_in', function() {
    person_location_warning_recv('warning: 59,GATE_IN,A320,2019-01-11 10:20:34.563,4,0,1', {
        ack: function(rsp) {
            channel_report({
                uuid: "TgsnTc-FENCE-0090"
            }, rsp);
        }
    });
});
IOT_TEST_CASE('fence_out', function() {
    person_location_warning_recv('warning: 59,GATEOUT,A320,2019-01-11 10:21:07.088,4,0,1', {
        ack: function(rsp) {
            channel_report({
                uuid: "TgsnTc-FENCE-0090"
            }, rsp);
        }
    });
});
IOT_TEST_CASE('fence', function() {
    var f = function(where, rgnid, gateseq) {
        person_location_warning_recv('warning: 59,' + where + ',A320,2019-01-11 10:20:34.563,' + 
            rgnid + ',' + gateseq + ',' + rgnid, {
            ack: function(rsp) {
                channel_report({
                    uuid: "TgsnTc-FENCE-0090"
                }, rsp);
            }
        });
    };
    f('GATE_IN', 1, 0);
    f('GATEOUT', 1, 1);
    f('GATE_IN', 2, 0);
    f('GATEOUT', 2, 1);
});


IOT_TEST_CASE('gis_dis', function() {

    var l = 2 * Math.PI * 6378137;
    printlog("earth l: " + l);
    var s = function(a) {
        var r = Math.cos(a * Math.PI / 180) * coor_earth_r;
        r = parseFloat(r.toFixed(4));
        printlog(a + " - r: " + r);
    };
    s(0);
    s(90);
    s(30);
    s(45);
    s(60);
    s(-45);

    var f = function(x1, y1, x2, y2) {
        var p1 = {
            lng: x1,
            lat: y1
        };
        var p2 = {
            lng: x2,
            lat: y2
        };
        var d1 = coor_getGpsDistance_unkown(p1, p2);
        var d2 = coor_getGpsDistance(p1, p2);
        printlog("distance: " + d1 + " | " + d2);
    };

    f(104.060867,30.594687, 104.070246,30.594842);
    f(104.060867,0, 104.060867,0);
    f(104.060867,0, 105.060867,0);
    f(104.060867,30.594687, 105.060867,30.594687);
    
    /*
    var p1 = {
        lng: 104.060867,
        lat: 30.594687
    };
    var p2 = {
        lng: 104.070246,
        lat: 30.594842
    };
    var d1 = coor_getGpsDistance (p1, p2);
    var d2 = coor_getGpsDistance2(p1, p2);
    printlog("distance: " + d1 + " | " + d2);
    */

    var n = function(l) {
        return (l * 180) / (Math.PI * coor_earth_r);
    };

    printlog("n(111319.49079327358): " + n(111319.49079327358));
});

IOT_TEST_CASE('gis_rel', function() {
    var f = function(x1, y1, x2, y2) {
        var p1 = {
            lng: x1,
            lat: y1
        };
        var p2 = {
            lng: x2,
            lat: y2
        };
        printlog(p1.lng + "," + p1.lat + " <-> " + p2.lng + "," + p2.lat);
        var p = coor_getGpsRelative(p1, p2);
        var x = p.x;
        var y = p.y;
        var d = Math.sqrt(x * x + y * y);
        printlog("coor_getGpsRelative: " + x + "," + y + " d: " + d + " | " + coor_getGpsDistance(p1, p2));
        var q = coor_getGpsAbsolute(p1, x, y);
        printlog("coor_getGpsAbsolute: " + q.lng + "," + q.lat);
    };

    f(104.060867,30.594687, 104.070246,30.594842);
});

IOT_TEST_CASE('gis_xian', function() {
    var f = function(x, y) {
        var p = {
            lng: x,
            lat: y
        };
        printlog("test:  " + p.lng + "," + p.lat);
        var xian80 = coor_getGpsToXian80(p);
        printlog("xian80: " + xian80.x + "," + xian80.y);
        var wgs84 = coor_getGpsFromXian80(xian80);
        printlog("wgs84: " + wgs84.lng + "," + wgs84.lat);
    };

    f(104.060867,30.594687);
    f(104.070246,30.594842);
    f(108.95, 34.53);
    f(114.098739747, 34.574592088);

    var xian80 = coor_gis_dd2xa80([114.098739747, 34.574592088]);
    printlog("xian80: " + xian80[0] + "," + xian80[1] + " | 3827405.771706,509060.177844");
    var gauss = coor_gis_BLToGauss(114.098739747, 34.574592088);
    printlog("xian80: " + gauss[0] + "," + gauss[1] + " | 3827405.771706,509060.177844");
    var wgs84 = coor_gis_GaussToBL(509060.177844, 3827405.771706);
    printlog("wgs84: " + wgs84[0] + "," + wgs84[1] + " | 114.098739747, 34.574592088");
});


IOT_TEST_CASE('gis_gps', function() {
    var s = {lng:104.060867, lat:30.594687};
    var d = {x:-2.56, y:2.37};
    var o = {x:10.19, y:1};

    var f0 = function() {
        printlog("as:(" + s.lng + "," + s.lat + ")");
        var ad = coor_getGpsAbsolute(s, d.x, d.y);
        var ao = coor_getGpsAbsolute(s, o.x, o.y);
        printlog("ad:(" + ad.lng + "," + ad.lat + 
            ") ao:(" + ao.lng + "," + ao.lat + ") ");
        var rd = coor_getGpsRelative(s, ad);
        var ro = coor_getGpsRelative(s, ao);
        printlog("rd: " + rd.x + "," + rd.y + " | " + d.x + "," + d.y + 
                " ro: " + ro.x + "," + ro.y + " | " + o.x + "," + o.y);
    } ();

    /// 都使用绝对坐标 (GPS)
    var f1 = function(x, y) {
        var data = {coordX:x,coordY:y};
        var node = {
            config: {
                start: s,
                device: coor_getGpsAbsolute(s, d.x, d.y),
                node: coor_getGpsAbsolute(s, o.x, o.y)
            }
        };
        radar_ruda_proc(data, {}, node);
        print_obj_member(data, printlog, "radar_ruda_proc 1");
    };

    /// 使用相对坐标 (GPS在线的起点位置)
    var f2 = function(x, y) {
        var data = {coordX:x,coordY:y};
        var node = {
            config: {
                start: s,
                device: d,
                node: o
            }
        };
        radar_ruda_proc(data, {}, node);
        print_obj_member(data, printlog, "radar_ruda_proc 2");
    };

    /// 使用北斗坐标 (GPS在线的起点位置)
    var f3 = function(x, y, offset_x, offset_y) {
        var data = {coordX:x,coordY:y};
        var node = {
            config: {
                start: s,
                device: {x: offset_x + d.x, y: offset_y + d.y},
                line: [{x: offset_x, y: offset_y}],
                node: {x: offset_x + o.x, y: offset_y + o.y}
            }
        };
        radar_ruda_proc(data, {}, node);
        print_obj_member(data, printlog, "radar_ruda_proc 3");
    };

    f1(3, 1);
    f2(3, 1);
    f3(3, 1, 1, 1.5);
    f3(3, 1, 50000, 60000);
    printlog("-----------------------");
    var x = o.x - d.x;
    var y = o.y - d.y;
    var l = Math.sqrt(x * x + y * y);
    f1(l, 0);
    f2(l, 0);
    f3(l, 0, 1, 1.5);
    f3(l, 0, 50000, 60000);
});


IOT_TEST_CASE('gis_line_rel', function() {
    var d = {x:-2.56, y:2.37};
    var o = {x:10.19, y:1};
    // var d = {x:2, y:3};
    // var o = {x:4, y:3};
    // var d = {x:2.56,  y:2};
    // var o = {x:10.19, y:1};
    var f = function(x, y) {
        var c = {x:x,y:y};
        var e = {x:x+o.x,y:y+o.y};
        var l = coor_getLinePara(c, e);
        printlog("line: {k:" + l.k + ", b:" + l.b + ", a:" + l.a + "}");
        var q = coor_getLineRelative(c, l, {x:x+d.x,y:y+d.y});
        printlog("toline: {x:" + q.x + ", y:" + q.y + "}");
    };

    f(0, 0);
    printlog("-----------------------");
    f(10000, 20000);
    printlog("-----------------------");
    f(50000, 60000);
});
