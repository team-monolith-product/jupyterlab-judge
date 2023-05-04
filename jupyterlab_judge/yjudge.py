import json

import y_py as Y
from jupyter_ydoc.ydoc import YBaseDoc

class YJudge(YBaseDoc):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._problem_id = self._ydoc.get_text("problemId")
        self._cell = self._ydoc.get_map("cell")
        
    def get(self):
        return json.dumps({
            'problem_id': str(self._problem_id),
            'code': str(self._cell.get('source')),
            'judge_format': 1
        })

    def set(self, value):
        value = json.loads(value)
        with self._ydoc.begin_transaction() as t:
            # clear problem id
            problem_id_len = len(self._problem_id)
            if problem_id_len:
                self._problem_id.delete_range(t, 0, problem_id_len)
            # initialize problem id
            if value['problem_id']:
                self._problem_id.extend(t, value['problem_id'])

            # clear cell
            self._cell.set(t, 'id', '')
            self._cell.set(t, 'metadata', {})
            self._cell.set(t, 'cell_type', 'code')
            self._cell.set(t, 'execution_count', 0)
            self._cell.set(t, 'source', Y.YText(value['code']))
            self._cell.set(t, 'outputs', Y.YArray())
    
    def observe(self, callback):
        self.unobserve()
        self._subscriptions[self._ystate] = self._ystate.observe(callback)
        self._subscriptions[self._problem_id] = self._problem_id.observe(callback)
        self._subscriptions[self._cell] = self._cell.observe_deep(callback)
