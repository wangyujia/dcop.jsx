/// js/app/iot/edge/door_access.js
/**
 * ��������Ե���Ž��Խ�
 */



/**
 * �Ž���Ϣ��Ӧ
 * @param {Pointer} buf ��������ַ
 * @param {Number} len ����������
 */
function door_access_recv(buf, len) {
    var s = bytes.str(buf, len);

    var dump_switch = (channel_dump_switch)? channel_dump_switch() : "";
    if (dump_switch == "all" || dump_switch == "door") {
        printlog("recv door info: " + s);
    }

    var nodes = s.split(',');
    if (nodes[0] && nodes[0].trim() == 'OnAttTrasactionEx') {
        var ip = (nodes[1])? nodes[1].trim() : "";
        var port = (nodes[2])? nodes[2].trim() : "";
        var user = (nodes[3])? nodes[3].trim() : "";
        return {
            fromip: ip,
            fromport: port,
            user: user
        };
    }
}


/**
 * �Ž� - ��������ʶ��̬�豸����
 * @param {Object} node �豸��Ϣ�ڵ�
 */
var door_haface_dll;
function door_haface_creator(node) {
    print_obj_member(node, trace, 'door_haface_creator node');
    /// ��һ�μ��ز����г�ʼ��
    if (!door_haface_dll) {
        door_haface_dll = dlls.create();
        trace('door_haface_dll create: ' + door_haface_dll + ' ' + typeof(door_haface_dll));
        print_obj_member(door_haface_dll, trace, 'door_haface_dll create');
        if (!door_haface_dll) return node;
        var rc = door_haface_dll.load('haface.dll');
        trace('door_haface_dll load rc:' + rc);
        if (rc != 0) { door_haface_dll = null; return node; }
        print_obj_member(door_haface_dll, trace, 'door_haface_dll load');
        door_haface_dll.HA_Init();
        door_haface_dll.HA_SetNotifyConnected(1);
        door_haface_dll.HA_InitFaceModel(null);
        var ConnectEventCb = function(node) {
            return function(cam, ip, port, event) {
                var dump_switch = (this.channel_dump_switch)? this.channel_dump_switch() : "";
                if (dump_switch == "all" || dump_switch == "door") {
                    printlog('door_haface_dll connect event cam: ' + cam + 
                        ' ip: ' + ip + ' port: ' + port + ' event: ' + event);
                }
                /*
                if (!this.channel_report) return;
                if (dump_switch == "all" || dump_switch == "door") {
                    print_obj_member(node, printlog, 'door_haface_creator node');
                }
                this.channel_report(node, {
                    fromip: ip,
                    fromport: port
                });
                */
            };
        };
        door_haface_dll.HA_RegConnectEventCb(ConnectEventCb(node));
    }

    /// �����豸����ʵ��
    if (node && node.hard && node.hard.fromip) {
        var ip = node.hard.fromip;
        var port = node.hard.fromport || 9527;
        var username = node.hard.username || "admin";
        var password = node.hard.password || "admin";
        var cam = door_haface_dll.HA_Connect(ip, port, username, password);
        trace('door_haface_dll connect ' + ip + ':' + port + ' cam: ' + cam + 
            ' username: ' + username + ' password: ' + password);
        var FaceRecoCb = function(node) {
            return function(cam, name, id, role, matched) {
                var dump_switch = (this.channel_dump_switch)? this.channel_dump_switch() : "";
                if (dump_switch == "all" || dump_switch == "door") {
                    printlog('door_haface_dll getting_face cam: ' + cam + 
                        ' name: ' + name + ' id: ' + id + 
                        ' role: ' + role + ' matched: ' + matched);
                }
                if (matched <= 0) return;
                if (!this.channel_report) return;
                if (dump_switch == "all" || dump_switch == "door") {
                    print_obj_member(node, printlog, 'door_haface_creator node');
                }
                this.channel_report(node, {
                    fromip: ip,
                    fromport: port,
                    user: id,
                    name: name,
                    role: role,
                    matched: matched
                });
            };
        };
        door_haface_dll.HA_RegFaceRecoCb(cam, FaceRecoCb(node));
    }

    return node;
}



/**
 * ��ʼ��ʱ��ͨ������Э���ʽ
 */
(function() {
    var oninit = function() {
        if (this.format_rsp) this.format_rsp('door_access', door_access_recv);
        if (this.device_type) this.device_type('haface', door_haface_creator);
    };

    if (typeof(door_root) != "undefined") {
        door_root.add('door_access', {oninit: oninit});
    }
}) ();


