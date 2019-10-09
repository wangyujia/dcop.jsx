/// js/app/proxy/transfer.js



/// 创建代理转发对象
/**
 *  
 */
var proxytranshead = 'TtRrAaNnSsFfEeRr\r\n';
function proxytrans(ondata) {
    var m_headers = {};
    var m_buffer = null;
    var m_state = "state_get_head";
    var m_data = null;

    /// 保存缓冲，并返回保存的长度
    var save_buff = function(buf, len) {
        m_buffer = bytes.create(buf, len);
        return len;
    }

    /// 从缓冲中加载，并清空缓冲区
    var load_buff = function(buf, len) {
        if (!m_buffer) return;
        m_buffer.append(buf, len);
        var tmp = m_buffer;
        m_buffer = null;
        return tmp;
    };

    /// 获取头部状态处理
    var state_get_head = function(buf, len) {
        /// TtRrAaNnSsFfEeRr
        /// channel: 100
        /// ip: 1.1.1.1
        /// port: 3456
        /// proto: tcpaccept
        /// length: 512
        /// 
        /// [data]

        var begin = bytes.find(buf, len, 0, proxytranshead);
        if (begin != 0) return save_buff(buf, len);

        var end = bytes.find(buf, len, 0, '\r\n\r\n');
        if (end < proxytranshead.length) return save_buff(buf, len);

        var str = bytes.str(buf, end + 2);
        var tmp = begin + proxytranshead.length;
        while ((tmp >= 0) && (tmp < end)) {
            var pos = str.indexOf(':', tmp);
            if (pos < 0) break;
            var name = str.substring(tmp, pos).trim();
            tmp = pos + 1;
            pos = str.indexOf('\r\n', tmp);
            if (pos < 0) break;
            var value = str.substring(tmp, pos).trim();
            m_headers[name] = value;
            tmp = pos + 2;
        }

        m_state = "state_get_data";

        this.channel = parseInt(m_headers.channel);
        this.ip = m_headers.ip;
        this.port = parseInt(m_headers.port);
        this.proto = m_headers.proto;
        this.index = parseInt(m_headers.index);
        this.length = parseInt(m_headers.length);
        return end + 4;
    };

    /// 获取数据状态处理
    var state_get_data = function(buf, len) {
        var tmp = parseInt(m_headers.length);
        if (!tmp) tmp = 0;
        if (tmp > len) return save_buff(buf, len);

        if (ondata) {
            ondata.call(this, buf, tmp);
        } else if (tmp > 0) {
            if (m_data) m_data.append(buf, tmp);
            else m_data = bytes.create(buf, tmp);
        } else {
            m_data = null;
        }
        
        m_state = "state_get_done";

        if (tmp < len) return save_buff(
            bytes.shift(buf, len, tmp), len - tmp);
        return len;
    }

    var m_proc = {
        state_get_head: state_get_head,
        state_get_data: state_get_data
    };
    
    /// 返回代理对象
    var o = {
        channel: 0,
        ip: "",
        port: 0,
        proto: "",
        index: 0,
        length: 0
    };

    /// 发送接口
    add_obj_method(o, 'send', function(ch, ip, port, proto, buf, len, i) {
        var s = proxytranshead;
        if (typeof(ch) != 'undefined') s += 'channel: ' + ch + '\r\n';
        if (typeof(ip) != 'undefined') s += 'ip: ' + ip + '\r\n';
        if (typeof(port) != 'undefined') s += 'port: ' + port + '\r\n';
        if (typeof(proto) != 'undefined') s += 'proto: ' + proto + '\r\n';
        if (typeof(i) != 'undefined') s += 'index: ' + i + '\r\n';
        s += 'length: ' + len + '\r\n\r\n';
        var buf_o = bytes.create(s);
        buf_o.append(buf, len);
        return buf_o;
    });

    /// 接收接口
    add_obj_method(o, 'recv', function(buf, len) {
        if (!buf || !len) return;

        var saved = load_buff(buf, len);
        if (saved) {
            buf = saved.buf;
            len = saved.len;
        }

        var pos = 0;
        while (pos < len) {
            var proc = m_proc[m_state];
            if (!proc) break;

            var tmp = bytes.shift(buf, len, pos);
            pos += proc.call(this, tmp, len - pos);

            if (m_state == "state_get_done") {
                if (pos < len) {
                    m_state = "state_get_head";
                }
            }
        }

        return (m_state == "state_get_done")? true : false;
    });

    /// 获取头部
    add_obj_method(o, 'headers', function() {
        return m_headers;
    });

    return o;
}
