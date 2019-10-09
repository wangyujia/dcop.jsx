/// js/app/iot/edge/ado_access.js
/**
 * ��������Ե��ADO���ݿ�Խ�
 */



/**
 * ADO���ݿ������б�
 *  {
 *      dll���صȷ��� ... ,
 *      dll��������� ...
 *  }
 */
var ado_access_list = {};




/**
 * ADO�����
 * @param {Object} o �������
 *  o: {
 *      type: "request",
 *      command: "ado-query",
 *      arg: {
 *          type: "car",
 *          connStr: "Provider=SQLOLEDB.1;" + 
 *              "Integrated Security=SSPI;" + 
 *              "Persist Security Info=False;" + 
 *              "Initial Catalog=znykt;" + 
 *              "Data Source=(local)",
 *          sqlList: {
 *              sql1: "...",
 *              sql2: "..."
 *          }
 *      }
 *  }
 * @param {Object} data ��Ӧ����
 * @param {String} dump_switch DUMP����
 */
function ado_access_proc(o, data, dump_switch) {
    if (dump_switch == "all" || dump_switch == "ado") {
        print_obj_member(o, printlog, 'ado_access_proc');
    }

    if (!o || !o.arg || !o.arg.type) {
        data.error = "ado login arg error";
        return false;
    }

    /// ��ADO�����б�����ӽڵ�
    var type = o.arg.type;
    var node = ado_access_list[type];
    if (!node) {
        node = ado_access_list[type] = {};
        node.conn = o.arg.connStr;
        node.login = false;
    }

    /// �����µ�ADO���󣬲���¼ADO���ݿ�
    if (!node.login) {
        if (!node.ado) node.ado = adoproxy();
        node.login = node.ado.login(node.conn);
    }

    if (dump_switch == "all" || dump_switch == "ado" || 
        dump_switch == type) {
        printlog('ado login ret:' + node.login);
    }

    if (!node.login) {
        data.error = "ado login fail";
        return false;
    }

    /// û��SQL�б���ֱ�ӷ��سɹ�
    var sqls = o.arg.sqlList;
    if (!sqls) return true;

    var notify = {
        type: type,
        data: {},
        dump: type
    };

    /// ѭ��ִ��SQL�б����ϱ���Ӧ
    for (var i in sqls) {
        var sql = sqls[i];
        if (dump_switch == "all" || dump_switch == "ado" || 
            dump_switch == type) {
            printlog("ado sql[" + i + "]: " + sql);
        }

        var rc = false;
        var ado = node.ado;
        var command = o.command;
        switch (command) {
            case 'ado-query':
                rc = ado.query(sql);
                break;
            case 'ado-transaction':
                rc = ado.query(sql, true);
                break;
            case 'ado-command':
                rc = ado.command(sql);
                break;
        }

        if (dump_switch == "all" || dump_switch == "ado" || 
            dump_switch == type) {
            print_obj_member(ado, printlog, "ado " + type);
            printlog("ado " + type + " '" + command + "' ret:" + rc);
        }

        if (!ado.data) notify.data[i] = [];
        else notify.data[i] = ado.data;
    }

    /// �ϱ����ݽ��
    if (this.channel_notify) {
        channel_notify(notify, dump_switch);
    } else {
        data.type = notify.type;
        data.data = notify.data;
        data.dump = notify.dump;
    }

    return true;
}



/**
 * ��ʼ��ʱ������ͨ��ע������
 */
(function() {
    var oninit = function() {
        control_command('ado-query', {
            process: ado_access_proc
        });
        control_command('ado-transaction', {
            process: ado_access_proc
        });
        control_command('ado-command', {
            process: ado_access_proc
        });
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('ado_access', {oninit: oninit});
    }
}) ();


