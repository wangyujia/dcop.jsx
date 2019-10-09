/// js/app/iot/edge/car_access.js
/**
 * 物联网边缘侧车辆对接
 */




var car_access_query_list = {};
var car_access_ado = null;
var car_access_login = false;

/**
 * 单色LED添加文字
 * @param {Object} o 命令对象
 * @param {Object} data 响应对象
 * @param {String} dump_switch DUMP开关
 */
function car_access_query_record(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "car") {
        print_obj_member(o, printlog, 'car_access_query_record');
    }

    if (!o || !o.arg) {
        data.error = "car command arg error";
        return false;
    }

    var database = o.arg.database;
    if (!database) database = 'znykt';

    if (!car_access_login) {
        if (!car_access_ado) car_access_ado = adoproxy();
        car_access_login = car_access_ado.login(
            'Provider=SQLOLEDB.1;' + 
            'Integrated Security=SSPI;' + 
            'Persist Security Info=False;' + 
            'Initial Catalog=' + database + ';' + 
            'Data Source=(local)');
    }

    if (dump_switch == "all" || dump_switch == "car") {
        printlog('ado login ret:' + car_access_login);
    }

    if (!car_access_login) return false;

    var notify = {
        type: "car",
        data: {},
        dump: "car"
    };
    for (var i in o.arg) {
        if (dump_switch == "all" || dump_switch == "car") {
            printlog("attr: " + i);
        }

        if (i == "database") continue;

        var sql = o.arg[i];
        if (dump_switch == "all" || dump_switch == "car") {
            printlog('ado query sql:' + sql);
        }

        var rc = car_access_ado.query(sql);
        if (dump_switch == "all" || dump_switch == "car") {
            print_obj_member(car_access_ado, printlog, 'car ado');
            printlog('ado query ret:' + rc);
        }

        if (!car_access_ado.data) notify.data[i] = [];
        else notify.data[i] = car_access_ado.data;
    }
    notify_http_report(notify, dump_switch);

    return true;
}



/**
 * 初始化时给控制通道注册命令
 */
(function() {
    var oninit = function() {
        control_command('get-car-records', {
            process: car_access_query_record
        });
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('car_access', {oninit: oninit});
    }
}) ();

