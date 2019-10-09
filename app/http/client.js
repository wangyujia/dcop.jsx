/// js/app/http/client.js
/**
 * ����HTTP�ͻ���Э��
 */


/**
 * ����HTTP�ͻ��˶���
 * @param {Function} ondata �������ݺ���
 */
function httpclient(ondata) {
    var m_ch = 0;
    var m_buf = bytes.zero();
    var m_len = 0;
    var m_free = false;
    var m_state = "head_recv";
    var m_rspcode = 0;
    var m_headers = {};
    var m_data = "";
    var m_need = 0;
    var m_debug = false;
    var m_host = "";

    /// ��λ����״̬
    var reset_recv = function() {
        var i = m_len;
        if (m_free) bytes.free(m_buf);
        m_buf = bytes.zero();
        m_len = 0;
        m_free = false;
        m_state = 'head_recv';
        if (m_debug) printlog('[reset_recv] ret: ' + i);
        return i;
    };

    /// ��λ���ս��
    var reset_result = function() {
        m_rspcode = 0;
        m_headers = {};
        m_data = "";
        m_need = 0;
        if (m_debug) printlog('[reset_result]');
    };

    /// ������������
    var keep_recv = function(pos) {
        if (!pos || (pos < 0)) pos = 0;
        if (bytes.zero(m_buf) || !m_len || (pos >= m_len)) {
            reset_recv();
            if (m_debug) printlog('[keep_recv] pos:' + pos + ' ret failed1');
            return 0;
        }
        
        var tmp = (!pos)? m_buf : bytes.shift(m_buf, m_len, pos);
        if (tmp) tmp = bytes.alloc(tmp, m_len - pos);
        if (!tmp) {
            reset_recv();
            if (m_debug) printlog('[keep_recv] pos:' + pos + ' ret failed2');
            return 0;
        }

        var i = m_len;
        if (m_free) bytes.free(m_buf);
        m_buf = tmp;
        m_len = m_len - pos;
        m_free = true;
        if (m_debug) printlog('[keep_recv] pos:' + pos + ' ret: ' + i);
        return i;
    };

    /// ��ȡͷ��
    var get_headers = function(str) {
        /// �������л�ȡ״̬
        var start = str.indexOf(' ');
        if (start < 0) return false;
        var end = str.indexOf('\r\n', start);
        if (end < 0) return false;
        m_rspcode = parseInt(str.substring(start+1, end));

        /// ���λ�ȡͷ����Ϣ
        start = end + 2;
        while ((start >= 0) && (start < str.length)) {
            end = str.indexOf(':', start);
            if (end < 0) break;
            var name = str.substring(start, end).trim();
            start = end + 1;
            end = str.indexOf('\r\n', start);
            if (end < 0) break;
            var value = str.substring(start, end).trim();
            m_headers[name] = value;
            start = end + 2;
        }
    };

    /// ����������
    var get_length_data = function(pos) {
        var cont_len = parseInt(m_headers['Content-Length']);
        if (cont_len <= 0) {
            if (ondata) ondata("");
            reset_recv();
            return pos;
        }

        /// ���ݳ���û���չ��������������ݣ��ȴ���������
        if (m_len < (pos + cont_len)) {
            var i = m_len;
            if (keep_recv(pos) > 0) {
                m_need = cont_len;
                m_state = 'data_recv_by_length';
            }
            return i;
        }

        /// �������ݣ��������µ�ͷ������״̬
        m_data = bytes.str(m_buf, m_len, pos, cont_len);
        m_need = 0;
        if (ondata) ondata(m_data);
        reset_recv();
        return pos + cont_len;
    };

    /// ���ֿ��ȡ����
    var get_chunked_data = function(pos) {
        if (m_debug) bytes.dump(bytes.shift(m_buf, m_len, pos), m_len - pos);

        /// ���ҿ鳤��
        var chun_head_end = bytes.find(m_buf, m_len, pos, '\r\n');
        if (m_debug) printlog('[get_chunked_data] chun_head_end: ' + chun_head_end);
        if (chun_head_end < 0) {
            var i = m_len;
            if (keep_recv(pos) > 0) {
                m_state = 'head_recv_by_chunked';
            }
            return i;
        }

        /// ��ȡ�鳤�� (��β��0����������CRLF)
        var chun_head_str = bytes.str(m_buf, m_len, pos, chun_head_end - pos);
        var chun_len = parseInt(chun_head_str, 16);
        if (m_debug) printlog('[get_chunked_data] chun_len: ' + chun_len);
        if (chun_len <= 0) {
            if (chun_head_str == "0") {
                if (m_len < (chun_head_end + 4)) {
                    var i = m_len;
                    if (keep_recv(chun_head_end + 2) > 0) {
                        m_need = 2;
                        m_state = 'end_recv_by_chunked';
                    }
                    return i;
                } else {
                    reset_recv();
                    return chun_head_end + 4;
                }
            } else {
                return reset_recv();
            }
        }

        /// ���տ����� (���Ⱥ����ݺ��涼��һ��CRLF)
        if (m_len < (chun_head_end + 2 + chun_len + 2)) {
            var i = m_len;
            if (keep_recv(chun_head_end + 2) > 0) {
                m_need = chun_len + 2;
                m_state = 'data_recv_by_chunked';
            }
            return i;
        }
        
        /// ��������
        var data = bytes.str(m_buf, m_len, chun_head_end + 2, chun_len);
        if (m_debug) printlog('[get_chunked_data] data: ' + data);
        if (ondata) ondata(data);
        m_data += data;
        m_state = 'head_recv_by_chunked';
        return chun_head_end + 2 + chun_len + 2;
    };

    /// ���ؿͻ��˶���
    var o = {
        ip: "",
        port: 0,
        proto: "",
        type: ""
    };

    /// ��ȡͨ��
    add_obj_method(o, 'channel', function() {
        return m_ch;
    });

    /// ����ͨ��
    add_obj_method(o, 'channel', function(ch) {
        m_ch = ch;
        this.ip = channel.ip(ch);
        this.port = channel.port(ch);
        this.proto = channel.proto(ch);
        this.type = channel.type(ch);
    });

    /// ���ͽӿ�
    add_obj_method(o, 'send', function(type, path, str) {

        var req = type + ' ' + path + ' HTTP/1.1\r\n';
        var host = (m_host)? m_host : this.ip;
        if (!this.port || (this.port == 80)) {
            req += 'Host: ' + host + '\r\n';
        } else {
            req += 'Host: ' + host + ':' + this.port + '\r\n';
        }

        req += 'Connection: keep-alive\r\n' + 
            'User-Agent: dcop.http.client.js\r\n' + 
            'Content-Type: application/json; charset=UTF-8\r\n';

        if (!str || !str.length) {
            req += '\r\n\r\n';
        } else {
            req += 'Content-Length: ' + str.length + '\r\n\r\n' + str;
        }

        if (m_debug) printlog("---------------------------------------");
        if (m_debug) printlog("[channel(" + m_ch + ") send http req: \r\n" + req);
        var ret = channel.send(m_ch, req);
        if (m_debug) printlog("[channel(" + m_ch + ") send http ret: " + ret);
        return ret;
    });

    /// ���սӿ�
    add_obj_method(o, 'recv', function(buf, len) {
        // bytes.dump(buf, len, print);

        /// ���֮ǰ�ջ��棬��ֱ��ʹ�õ�ǰ���룻������ӻ���
        if (bytes.zero(m_buf)) {
            m_buf = buf;
            m_len = len;
        } else {
            var tmp = bytes.append(m_buf, m_len, buf, len);
            if (bytes.zero(tmp)) {reset_recv(); return false;}
            m_buf = tmp;
            m_len = m_len + len;
        }
        
        /// ��״̬���ղ�����
        for (var i = 0; i < m_len; ) {
            if (m_debug) printlog('m_state: ' + m_state);
            if (m_state == 'head_recv') {
                reset_result();
                if (m_debug) printlog("m_buf: " + m_buf + " i: " + i);
                if (m_debug) printlog("m_buf+i: " + bytes.shift(m_buf, m_len, i));
                if (m_debug) bytes.dump(bytes.shift(m_buf, m_len, i), m_len - i);
                var end = bytes.find(m_buf, m_len, i, '\r\n\r\n');
                if (m_debug) printlog('[head_recv] bytes.find ret: ' + end);
                if (end < 0) {
                    if (!m_free || i) keep_recv(i);
                    if (m_debug) printlog('[head_recv] uncompleted headers!');
                    return false;
                }

                if (m_debug) printlog('get_headers');
                get_headers(bytes.str(m_buf, m_len, i, end+4-i));
                i = end + 4;
                print_obj_member(m_headers, printlog);

                if (typeof(m_headers['Content-Length']) != "undefined") {
                    if (m_debug) printlog('[head_recv] get_length_data');
                    i = get_length_data(i);
                    if (m_debug) printlog('[head_recv] get_length_data pos:' + i);
                } else if (m_headers['Transfer-Encoding'] == 'chunked') {
                    if (m_debug) printlog('[head_recv] get_chunked_data');
                    while (i < m_len) { i = get_chunked_data(i); }
                    if (m_debug) printlog('[head_recv] get_chunked_data pos:' + i);
                } else if (m_headers['Transfer-Encoding'] == 'identity') {
                    m_data = bytes.str(m_buf, m_len, i, m_len - i);
                    if (ondata) ondata(m_data);
                    reset_recv();
                    i = m_len;
                }

            } else if (m_state == 'data_recv_by_length') {
                if (m_len < (i + m_need)) {
                    if (!m_free || i) keep_recv(i);
                    return false;
                }
                
                m_data = bytes.str(m_buf, m_len, i, m_need);
                if (ondata) ondata(m_data);
                reset_recv();
                i += m_need;
                m_need = 0;

            } else if (m_state == 'head_recv_by_chunked') {
                while (i < m_len) { i = get_chunked_data(i); }

            } else if (m_state == 'end_recv_by_chunked') {
                if (m_len < (i + m_need)) {
                    if (!m_free || i) keep_recv(i);
                    return false;
                }

                reset_recv();
                i += m_need;
                m_need = 0;

            } else if (state == 'data_recv_by_chunked') {
                if (m_len < (i + m_need)) {
                    if (!m_free || i) i = keep_recv(i);
                    return false;
                }

                var data = bytes.str(m_buf, m_len, i, m_need - 2);
                if (ondata) ondata(data);
                m_data += data;
                i += m_need;
                m_need = 0;

                while (i < m_len) { i = get_chunked_data(i); }
            }
        }
        
        if (!m_free) {m_buf = 0; m_len = 0;}
        return true;
    });

    /// ��ȡ״̬
    add_obj_method(o, 'code', function() {
        return m_rspcode;
    });

    /// ��ȡͷ��
    add_obj_method(o, 'headers', function() {
        return m_headers;
    });
    add_obj_method(o, 'headers', function(name) {
        return m_headers[name];
    });

    /// ��ȡ����
    add_obj_method(o, 'data', function() {
        return m_data;
    });

    /// ��ȡ�����õ���
    add_obj_method(o, 'debug', function() {
        return m_debug;
    });
    add_obj_method(o, 'debug', function(debug) {
        m_debug = debug;
    });

    /// ��ȡ������������
    add_obj_method(o, 'host', function() {
        return m_host;
    });
    add_obj_method(o, 'host', function(host) {
        m_host = host;
    });

    return o;
}

