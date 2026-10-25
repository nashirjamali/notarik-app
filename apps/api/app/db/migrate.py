from pathlib import Path

_installed = False


def install_revision_scan() -> None:
    global _installed
    if _installed:
        return
    import alembic.script.base as script_base

    original = script_base.Script._from_path

    def _from_path(cls, scriptdir, path):
        if Path(path).name == "env.py":
            return None
        return original.__func__(cls, scriptdir, path)

    script_base.Script._from_path = classmethod(_from_path)
    _installed = True


def main() -> None:
    install_revision_scan()
    from alembic.config import main as alembic_main

    alembic_main()


if __name__ == "__main__":
    main()
