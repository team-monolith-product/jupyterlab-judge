"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""
import os

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)

# Use test directories instead of local environment.
# This prevents local settings from affecting test results.
#
# Why LabApp instead of LabServerApp?
# - LabApp._default_app_settings_dir() computes default from app_dir
# - LabServerApp.app_settings_dir is inherited but overridden by LabApp's @default decorator
# - Setting on LabApp ensures the value is used before the default is computed
HERE = os.path.dirname(os.path.abspath(__file__))
c.LabApp.app_settings_dir = os.path.join(HERE, 'test-app-settings')    # overrides.json 등
c.LabApp.user_settings_dir = os.path.join(HERE, 'test-user-settings')  # 사용자 설정

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
