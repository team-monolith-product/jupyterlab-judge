# Jupyter Lab Judge

[![Github Actions Status](https://github.com/team-monolith-product/jupyterlab-judge/workflows/Build/badge.svg)](https://github.com/team-monolith-product/jupyterlab-judge/actions/workflows/build.yml)

Work In Progress.

A simple online judge for Jupyter Lab.

## Highlights

![highlights](https://user-images.githubusercontent.com/4434752/174207715-fff3ecb5-0143-41f0-a162-d4b17a517874.gif)

## Goal
- No additional system for code execution
- Solve and get result on Jupyter Lab
- Replaceable backend

### No Additional System For Code Execution

Typical online judge systems require task manager for code executions. 
This project uses kernels to execute codes. Therefore no other system is required.
However this architecture leads some security risks. It will be explained later.

### Solve And Get Result On Jupyter Lab

This project includes jupyter lab extension for solving problems and submitting solutions.

### Replaceable Backend

(WIP) Basically, problems are retrieved from [codle.io](https://codle.io/), and submission history is stored in browsers.
Problem and submission storage can be configured.

## Security

In this system, code is executed at users' notebook server.
Therefore test cases for problems must be delivered to the users.
This could be a serious risk for some systems. Be aware of it.

## Architecture

This extension is composed of a Python package named `jupyterlab_judge`
for the server extension and a NPM package named `jupyterlab-judge`
for the frontend extension.

## Requirements

### 0.\*.\*

* JupyterLab >= 3.0

### 1.\*.\*

* JupyterLab >= 4.0

During 4.0 development process pypi `4.0.0a27` and npm `4.0.0-alpha.12` is used. Not actively maintained.

## Install

To install the extension, execute:

```bash
pip install jupyterlab_judge
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab_judge
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

### Development Environment

In `0.*.*`, you can create Conda environment by executing :
```
conda create -n jupyterlab-ext --override-channels --strict-channel-priority -c conda-forge -c nodefaults jupyterlab=3 cookiecutter nodejs jupyter-packaging git
```

In `1.*.*`, you can create Conda environment by executing :
```
conda create -n jupyterlab4-ext --override-channels --strict-channel-priority -c conda-forge -c nodefaults cookiecutter nodejs jupyter-packaging git
conda activate jupyterlab4-ext
pip install jupyterlab==4.0.0a27
```

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_judge directory
# Install package in development mode
pip install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyterlab_judge
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable jupyterlab_judge
pip uninstall jupyterlab_judge
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-judge` within that folder.

### Packaging the extension

See [RELEASE](RELEASE.md)

### Translate

After adding `trans.__`, execute following code
```
jupyterlab-translate update . jupyterlab_judge -l ko_KR
```

This will update `jupyterlab_judge.po` file with some errors. (ignore it)

Add your translation to `jupyterlab_judge.po` and execute
```
jupyterlab-translate compile . jupyterlab_judge -l ko_KR
```