/// js/app/db/ado_proxy.js
/**
 * ���ݿ��ADO����
 */



/**
 * ����ADO����̬�����
 * @returns {Object} ��̬�����
 *  return: {
 *      login:   {Function} ��¼ function(str) { ... true; }
 *      query:   {Function} ��ѯ (ָ������) function(sql, transaction) { ... true; }
 *      query:   {Function} ��ѯ (��������) function(sql) { ... true; }
 *      command: {Function} ���� function(sql) { ... true; }
 *  }
 */
function adoproxy() {
    var m_dll = dlls.create();
    var m_rc = m_dll.load('AdoProxy.dll');

    var o = {};

    /// ��¼�ӿ�
    add_obj_method(o, 'login', function(str) {
        if (!m_dll) return false;

        var rc = m_dll.login(str);
        return (rc == 0)? true : false;
    });

    /// ��ѯ�ӿ�
    add_obj_method(o, 'query', function(sql, transaction) {
        if (!m_dll) return false;

        var out = m_dll.query(sql, transaction);
        if (out.rc == 0) {
            this.data = out.data;
            return true;
        }

        this.err = out.err;
        return false;
    });

    add_obj_method(o, 'query', function(sql) {
        if (!m_dll) return false;

        var out = m_dll.query(sql);
        if (out.rc == 0) {
            this.data = out.data;
            return true;
        }

        this.err = out.err;
        return false;
    });

    add_obj_method(o, 'command', function(sql) {
        if (!m_dll) return false;

        var out = m_dll.command(sql);
        if (out.rc == 0) {
            return true;
        }

        this.err = out.err;
        return false;
    });

    return o;
}

