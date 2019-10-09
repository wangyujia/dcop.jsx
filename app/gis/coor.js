/// js/app/gis/coor.js
/**
 * ������Ϣ����
 */



var MACRO_AXIS = 6378137; // ���Բ��ƽ���뾶
var MINOR_AXIS = 6356752; // �����ĳ��ȣ��������������һ��


/// �ٶ��Ǵ�Բ����ʱ�ĵ���뾶
var coor_earth_r = 6378137;



/// ������굽�ռ�ֱ�������ת��
function coor_gis_dd2kjzj(dd) {
    var a = 6378137, b = 6356752.314;
    var ee = (a * a - b * b) / (a * a);
    var L = dd[0] * Math.PI / 180, B = dd[1] * Math.PI / 180, H = dd[2];
    var N = a / Math.sqrt(1 - ee * Math.sin(B) * Math.sin(B));
    var X = (N + H) * Math.cos(B) * Math.cos(L);
    var Y = (N + H) * Math.cos(B) * Math.sin(L);
    var Z = (N * (1 - ee) + H) * Math.sin(B);
    return [X,Y,Z];
}

/// �ռ�ֱ�����굽��������ת��
function coor_gis_kjzj2dd(kjzj) {
    var X = kjzj[0], Y = kjzj[1], Z = kjzj[2];
    var a = 6378140;
    var f = 1 / 298.257;
    var e2 = 2 * f - f * f; // e^2;
    var L = (Math.atan(Y / X) + Math.PI) * 180.0 / Math.PI;
    var B2 = Math.atan(Z / Math.sqrt(X * X + Y * Y));
    var B1;
    var N;
    while (true) {
        N = a / Math.sqrt(1 - f * (2 - f) * Math.sin(B2) * Math.sin(B2));
        B1 = Math.atan((Z + N * f * (2 - f) * Math.sin(B2)) / Math.sqrt(X * X + Y * Y));
        if (Math.abs(B1 - B2) < 0.0000000001) break;
        B2 = B1;
    }
    var H = Z / Math.sin(B2) - N * (1 - e2);
    var B = B2 * 180.0 / Math.PI;

    return [L,B,H];
}

/// ������굽����80��ת��
function coor_gis_dd2xa80(dd) {
    dd = coor_gis_kjzj2dd(coor_gis_dd2kjzj([dd[0], dd[1], 0]));
    var L = dd[0] * Math.PI / 180, B = dd[1] * Math.PI / 180;

    /// ������
    var cosB = Math.cos(B);
    var sinB = Math.sin(B);
    var cosB_2 = cosB * cosB;
    var Lo = 117; // ���������߾��� ����117 ����123 ���� 87 [Lo=(6n��3)��]
    var l = L - Lo * Math.PI / 180;
    var ll = l * l;

    /// ����ϵ��
    var N = 6399596.652 - (21565.045 - (108.996 - 0.603 * cosB_2) * cosB_2) * cosB_2;
    var a0 = 32144.5189 - (135.3646 - (0.7034 - 0.0041 * cosB_2) * cosB_2) * cosB_2;
    var a4 = (0.25 + 0.00253 * cosB_2) * cosB_2 - 0.04167;
    var a6 = (0.166 * cosB_2 - 0.084) * cosB_2;
    var a3 = (0.3333333 + 0.001123 * cosB_2) * cosB_2 - 0.1666667;
    var a5 = 0.00878 - (0.1702 - 0.20382 * cosB_2) * cosB_2;

    //�����˹ƽ������ֵ
    var x = 6367452.1328 * B - (a0 - (0.5 + (a4 + a6 * ll) * ll) * ll * N) * cosB * sinB;
    var y = (1 + (a3 + a5 * ll) * ll) * l * N * cosB + 500000;

    return [x, y];
}


/// �ɸ�˹ͶӰ���귴��ɾ�γ��
function coor_gis_GaussToBL(X, Y) {
  var ProjNo; var ZoneWide; // ����
  var longitude1,latitude1, longitude0, X0,Y0, xval,yval;//latitude0,
  var e1,e2,f,a, ee, NN, T,C, M, D,R,u,fai, iPI;
  iPI = 0.0174532925199433; ////3.1415926535898/180.0;
  //a = 6378245.0; f = 1.0/298.3; //54�걱������ϵ����
  a = 6378140.0; f = 1/298.257; //80����������ϵ����
  ZoneWide = 6; ////6�ȴ���
  ProjNo = X / 1000000 ; //���Ҵ���
  longitude0 = (ProjNo-1) * ZoneWide + ZoneWide / 2;
  longitude0 = longitude0 * iPI ; //���뾭��
  
  X0 = ProjNo*1000000 + 500000;
  Y0 = 0;
  xval = X-X0; yval = Y-Y0; //���ڴ������
  e2 = 2*f-f*f;
  e1 = (1.0-Math.sqrt(1-e2))/(1.0+Math.sqrt(1-e2));
  ee = e2/(1-e2);
  M = yval;
  u = M/(a*(1-e2/4-3*e2*e2/64-5*e2*e2*e2/256));
  fai = u+(3*e1/2-27*e1*e1*e1/32)*Math.sin(2*u)+(21*e1*e1/16-55*e1*e1*e1*e1/32)*Math.sin(
  4*u)
  +(151*e1*e1*e1/96)*Math.sin(6*u)+(1097*e1*e1*e1*e1/512)*Math.sin(8*u);
  C = ee*Math.cos(fai)*Math.cos(fai);
  T = Math.tan(fai)*Math.tan(fai);
  NN = a/Math.sqrt(1.0-e2*Math.sin(fai)*Math.sin(fai));
  R = a*(1-e2)/Math.sqrt((1-e2*Math.sin(fai)*Math.sin(fai))*(1-e2*Math.sin(fai)*Math.sin(fai))*(1-e2*Math.sin
  (fai)*Math.sin(fai)));
  D = xval/NN;
  //���㾭��(Longitude) γ��(Latitude)
  longitude1 = longitude0+(D-(1+2*T+C)*D*D*D/6+(5-2*C+28*T-3*C*C+8*ee+24*T*T)*D
  *D*D*D*D/120)/Math.cos(fai);
  latitude1 = fai -(NN*Math.tan(fai)/R)*(D*D/2-(5+3*T+10*C-4*C*C-9*ee)*D*D*D*D/24
  +(61+90*T+298*C+45*T*T-256*ee-3*C*C)*D*D*D*D*D*D/720);
  /// ת��Ϊ�� DD
  return [longitude1 / iPI, latitude1 / iPI];
}

function coor_gis_BLToGauss(longitude, latitude) {
 var ProjNo=0; var ZoneWide; ////����
 var longitude1,latitude1, longitude0,latitude0, X0,Y0, xval,yval;
 var a,f, e2,ee, NN, T,C,A, M, iPI;
 iPI = 0.0174532925199433; ////3.1415926535898/180.0;
 ZoneWide = 6; ////6�ȴ���
 a=6378245.0; f=1.0/298.3; //54�걱������ϵ����
 ////a=6378140.0; f=1/298.257; //80����������ϵ����
 ProjNo = longitude / ZoneWide;
 longitude0 = ProjNo * ZoneWide + ZoneWide / 2;
 longitude0 = longitude0 * iPI ;
 latitude0 = 0;
 longitude1 = longitude * iPI ; //����ת��Ϊ����
 latitude1 = latitude * iPI ; //γ��ת��Ϊ����
 e2=2*f-f*f;
 ee=e2*(1.0-e2);
 NN=a/Math.sqrt(1.0-e2*Math.sin(latitude1)*Math.sin(latitude1));
 T=Math.tan(latitude1)*Math.tan(latitude1);
 C=ee*Math.cos(latitude1)*Math.cos(latitude1);
 A=(longitude1-longitude0)*Math.cos(latitude1);
 M=a*((1-e2/4-3*e2*e2/64-5*e2*e2*e2/256)*latitude1-(3*e2/8+3*e2*e2/32+45*e2*e2
 *e2/1024)*Math.sin(2*latitude1)
 +(15*e2*e2/256+45*e2*e2*e2/1024)*Math.sin(4*latitude1)-(35*e2*e2*e2/3072)*Math.sin(6*latitude1));
 xval = NN*(A+(1-T+C)*A*A*A/6+(5-18*T+T*T+72*C-58*ee)*A*A*A*A*A/120);
 yval = M+NN*Math.tan(latitude1)*(A*A/2+(5-T+9*C+4*C*C)*A*A*A*A/24
 +(61-58*T+T*T+600*C-330*ee)*A*A*A*A*A*A/720);
 X0 = 1000000*(ProjNo+1)+500000;
 Y0 = 0;
 xval = xval+X0; yval = yval+Y0;
 return [xval, yval];
}


/**
 * ��ȡGPS�����֮��ľ��� (��λ:��) [δ֪��Դ]
 * @param {Object} p1 ��1
 * @param {Object} p2 ��2
 *  ��: {
        lng: 104.060867, // ����
        lat:  30.594687  // γ��
 *  }
 */
function coor_getGpsDistance_unkown(p1, p2) {
    /// ���ݽǶȻ�ȡ���� (���Ǻ���ʹ�õ��ǻ�����Ϊ����)
    var getRad = function(d) {
        return d * Math.PI / 180;
    }

    if (!p1) p1 = {lng:0,lat:0};
    if (!p2) p2 = {lng:0,lat:0};

    var radLat1 = getRad(p1.lat);
    var radLat2 = getRad(p2.lat);

    var a = radLat1 - radLat2;
    var b = getRad(p1.lng) - getRad(p2.lng);

    /// Haversin�Ǹ����ֹ�ʽ��ȥ�˽�һ��
    var Haversin = function(c) {
        var v = Math.sin(c / 2);
        return Math.pow(v,2);
    }

    var h = Haversin(a) + Math.cos(radLat1) * Math.cos(radLat2) * Haversin(b);
    var distance = 2 * 6378137 * Math.asin(Math.sqrt(h));
    distance = Math.round(distance * 10000) / 10000;
    return distance;
}


/**
 * ��ȡGPS�����֮��ľ��� (��λ:��)
 * @param {Object} p1 ��1
 * @param {Object} p2 ��2
 *  ��: {
        lng: 104.060867, // ����
        lat:  30.594687  // γ��
 *  }
 */
function coor_getGpsDistance(p1, p2) {
    if (!p1) p1 = {lng:0,lat:0};
    if (!p2) p2 = {lng:0,lat:0};

    var a = Math.cos(p2.lat * Math.PI / 180);
    var b = Math.sin(p2.lat * Math.PI / 180) - Math.sin(p1.lat * Math.PI / 180);
    var c = Math.cos(p1.lat * Math.PI / 180);
    var d = Math.sqrt(a * a + c * c - 2 * a * c * Math.cos((p2.lng - p1.lng) * Math.PI / 180));
    var e = Math.sqrt(b * b + d * d);
    var f = Math.asin(e / 2) * 2 * coor_earth_r;
    return Math.round(f * 10000) / 10000;
}


/**
 * ��ȡGPS����������� (��λ:��)
 * @param {Object} p1 ��1
 * @param {Object} p2 ��2
 *  ��: {
        lng: 104.060867, // ����
        lat:  30.594687  // γ��
 *  }
 */
function coor_getGpsRelative(p1, p2) {
    if (!p1) p1 = {lng:0,lat:0};
    if (!p2) p2 = {lng:0,lat:0};

    var r = Math.cos(p1.lat * Math.PI / 180) * coor_earth_r;
    var x = Math.PI * ((p2.lng - p1.lng) / 180) * r;
    var y = Math.PI * ((p2.lat - p1.lat) / 180) * coor_earth_r;
    return {
        x: Math.round(x * 10000) / 10000,
        y: Math.round(y * 10000) / 10000
    };
}
function coor_getGpsRelative_ab(p1, p2) {
    if (!p1) p1 = {lng:0,lat:0};
    if (!p2) p2 = {lng:0,lat:0};

    var a = MACRO_AXIS;
    var b = MINOR_AXIS;
    var t = Math.tan(p1.lat * Math.PI / 180);
    var r = (a * b) / Math.sqrt(b * b + a * a * t * t);
    var x = Math.PI * ((p2.lng - p1.lng) / 180) * r;
    var y = Math.PI * ((p2.lat - p1.lat) / 180) * coor_earth_r;
    return {
        x: Math.round(x * 10000) / 10000,
        y: Math.round(y * 10000) / 10000
    };
}


/**
 * ��ȡGPS����������� (��λ:��γ��)
 * @param {Object} p1 ��1
 * @param {Number} x ����������� (��λ:��)
 * @param {Number} y �ϱ�������� (��λ:��)
 *  ��: {
        lng: 104.060867, // ����
        lat:  30.594687  // γ��
    }
 */
function coor_getGpsAbsolute(p1, x, y) {
    if (!p1) p1 = {lng:0,lat:0};
    if (!x) x = 0;
    if (!y) y = 0;

    var r = Math.cos(p1.lat * Math.PI / 180) * coor_earth_r;
    var m = (x * 180) / (Math.PI * r);
    var n = (y * 180) / (Math.PI * coor_earth_r);
    return {
        lng: Math.round((p1.lng + m) * 1000000000) / 1000000000,
        lat: Math.round((p1.lat + n) * 1000000000) / 1000000000
    };
}


function coor_getGpsToXian80(wgs84) {
    var p = {lng:0,lat:0}; // 108.95,34.53
    var q = coor_getGpsRelative(p, wgs84);
    return q;
}


function coor_getGpsFromXian80(xian80) {
    var p = {lng:0,lat:0}; // 108.95,34.53
    var q = coor_getGpsAbsolute(p, xian80.x, xian80.y);
    return q;
}


/**
 * ��ȡֱ�ߵĽǶ� (���뾭������������)
 * @param {Object} p1 ��1
 * @param {Object} p2 ��2
 *  ��: {
        x: 1.5, // X������
        y: 1.0  // Y������
    }
 */
function coor_getLineAngle(p1, p2) {
    if (!p1) p1 = {x:0,y:0};
    if (!p2) p2 = {x:0,y:0};
    var delta_x = p2.x - p1.x;
    var delta_y = p2.y - p1.y;
    if (delta_x == 0) {
        if (delta_y == 0) return 0;
        return (p2.y > p1.y)? 90 : 270;
    } else {
        var tan   = Math.atan(delta_y / delta_x);
        var angle = tan * 180 / Math.PI;
        var r = (tan > 0)? ((p2.x > p1.x)? angle : (angle + 180)) : 
            ((p2.x > p1.x)? (angle + 360) : (angle + 180));
        return (r % 360);
    }
}


/**
 * ��ȡֱ�ߵĲ��� (���뾭������������)
 * @param {Object} p1 ��1
 * @param {Object} p2 ��2
 *  ��: {
        x: 1.5, // X������
        y: 1.0  // Y������
    }
 */
function coor_getLinePara(p1, p2) {
    if (!p1) p1 = {x:0,y:0};
    if (!p2) p2 = {x:0,y:0};
    var k = 0;     var b = 0;
    var delta_x = p2.x - p1.x;
    var delta_y = p2.y - p1.y;
    if (delta_x == 0) {
        if (delta_y == 0) return;
        k = null;
        b = p1.x;
    } else {
        k = delta_y / delta_x;
        b = p1.y - k * p1.x;
    }

    return {
        k: (k == null)? null : k,
        b: b,
        p: {x:p1.x,y:p1.y},
        a: coor_getLineAngle(p1, p2)
    };
}


/**
 * ��ȡ��֮��ľ���
 * @param {Object} p1 ��1
 * @param {Object} p2 ��2
 *  ��: {
        x: 1.5, // X������
        y: 1.0  // Y������
    }
 */
function coor_getPointDistance(p1, p2) {
    if (!p1) p1 = {x:0,y:0};
    if (!p2) p2 = {x:0,y:0};
    var delta_x = p2.x - p1.x;
    var delta_y = p2.y - p1.y;
    var d = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
    return Math.round(d * 10000) / 10000;
}


/**
 * ��ȡ��ĳ��Ĵ�ֱ��
 * @param {Object} l ��
 * @param {Number} p ��
 */
function coor_getLineVertical(l, p) {
    if (!l) l = {k:0,b:0,p:{x:0,y:0},a:0};
    if (!p) p = {x:0,y:0};
    var k = (l.k == null)? 0 : ((!l.k)? null : (-1 / l.k));
    var b = (k == null)? p.x : (p.y - k * p.x);
    var x = (l.k == null)? l.b : ((k == null)? b : ((b - l.b) / (l.k - k)));
    var y = (k == null)? l.b : (k * x + b);
    var c = {x: Math.round(x * 10000) / 10000,y: Math.round(y * 10000) / 10000};
    return {
        k: (k == null)? null : k,
        b: b,
        p: c,
        a: coor_getLineAngle(c, p)
    };
}


/**
 * ��ȡp���ֱ��l��������� (ֱ���ϵĵ�cΪ�������ĵ�)
 * @param {Object} c ��
 * @param {Object} l ��
 * @param {Object} p ��
 */
function coor_getLineRelative(c, l, p) {
    if (!l) l = {k:0,b:0,p:{x:0,y:0},a:0};
    var v = coor_getLineVertical(l, p);
    var m = coor_getPointDistance(v.p, c);
    var n = coor_getPointDistance(v.p, p);
    var a = coor_getLineAngle(v.p, c) - l.a;
    var x = (a < -90 || a > 90)? m : (0 - m);
    var b = v.a - l.a;
    var y = (b > 0 && b < 180)? n : (0 - n);
    return {x:x,y:y};
}


/**
 * ��ȡֱ��(���ĵ�c+�Ƕ�a)���������p��Ӧ�ľ������� (ֱ���ϵĵ�cΪ�������ĵ�)
 * @param {Object} c ��
 * @param {Number} a ��
 * @param {Object} p ��
 */
function coor_getLineAbsolute(c, a, p) {
    if (!c) c = {x:0,y:0};
    if (!p) p = {x:0,y:0};
    var b = coor_getLineAngle({x:0,y:0}, p);
    var r = (a + b) * Math.PI / 180;
    var x = p.x;
    var y = p.y;
    var d = Math.sqrt(x*x + y*y);
    var m = d * Math.cos(r);
    var n = d * Math.sin(r);
    var x = Math.round((c.x + m) * 10000) / 10000;
    var y = Math.round((c.y + n) * 10000) / 10000;
    return {x:x,y:y};
}


/**
 * ��ȡ����ת�������
 * @param {Number} p ��
 * @param {Number} a �Ƕ�
 */
function coor_getPointRotate(p, a) {
    var r = a * Math.PI / 180;
    var x = p.x * Math.cos(r) - p.y * Math.sin(r);
    var y = p.x * Math.sin(r) + p.y * Math.cos(r);
    return {
        x: Math.round(x * 10000) / 10000,
        y: Math.round(y * 10000) / 10000
    };
}

