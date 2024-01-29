import unittest

import jupyterlab_judge


class TestActivation(unittest.TestCase):
    def setUp(self):
        # Set up any necessary resources before running the test
        pass

    def tearDown(self):
        # Clean up any resources after running the test
        pass

    def test_extension_activation(self):
        # Create an instance of the jupyterlab-judge extension
        extension = jupyterlab_judge.JupyterLabJudge()

        # Assert that the extension is activated by checking if the activation console message is emitted
        self.assertTrue(extension.is_activated(), "JupyterLab extension jupyterlab-judge is activated!")

if __name__ == '__main__':
    # Run the test case only if the jupyterlab-judge extension is installed
    if jupyterlab_judge.is_installed():
        # Run the test case only if the JupyterLab webpage is not loaded before running the tests
        if not jupyterlab_judge.is_webpage_loaded():
            unittest.main()
