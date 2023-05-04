import json

import y_py as Y
from jupyter_ydoc.ydoc import YBaseDoc

class YJudge(YBaseDoc):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._problem_id = self._ydoc.get_text("problem_id")
        self._source = self._ydoc.get_text("source")

    def get(self):
        return json.dumps({
            'problem_id': str(self._problem_id),
            'code': str(self._source),
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

            # clear source
            source_len = len(self._source)
            if source_len:
                self._source.delete_range(t, 0, source_len)
            # initialize source
            if value['code']:
                self._source.extend(t, value['code'])
    
    def observe(self, callback):
        self.unobserve()
        self._subscriptions[self._ystate] = self._ystate.observe(callback)
        self._subscriptions[self._problem_id] = self._problem_id.observe(callback)
        self._subscriptions[self._source] = self._source.observe_deep(callback)
