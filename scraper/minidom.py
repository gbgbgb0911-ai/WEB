"""Árbol HTML mínimo sobre html.parser, para consultas por tag/clase/atributo.

Se usa en lugar de regex porque la descripción y la galería dependen de
anidamiento real (`div.informacion` > todo lo que sigue a `div.tit_desc`).
Sin dependencias externas: el entorno del cliente solo garantiza Python 3.9+.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}
# Tags cuyo contenido no es texto del documento.
OPACO = {"script", "style"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = attrs or {}
        self.children = []
        self.parent = parent

    def get(self, name, default=""):
        return self.attrs.get(name, default)

    @property
    def classes(self):
        return self.get("class", "").split()

    def text(self):
        partes = []
        pila = [self]
        while pila:
            n = pila.pop(0)
            if isinstance(n, str):
                partes.append(n)
                continue
            if n.tag in OPACO:
                continue
            pila = list(n.children) + pila
        return re.sub(r"\s+", " ", "".join(partes)).strip()

    def find_all(self, tag=None, cls=None, id=None, attr=None, limit=None):
        """attr: (nombre, valor|None) — valor None solo exige presencia."""
        out = []
        pila = [self]
        while pila:
            n = pila.pop(0)
            if isinstance(n, str):
                continue
            if n is not self and _coincide(n, tag, cls, id, attr):
                out.append(n)
                if limit and len(out) >= limit:
                    return out
            pila = list(n.children) + pila
        return out

    def find(self, **kw):
        r = self.find_all(limit=1, **kw)
        return r[0] if r else None

    def __repr__(self):
        return f"<{self.tag} {self.attrs}>"


def _coincide(n, tag, cls, id, attr):
    if tag and n.tag != tag:
        return False
    if cls and cls not in n.classes:
        return False
    if id and n.get("id") != id:
        return False
    if attr:
        nombre, valor = attr
        if nombre not in n.attrs:
            return False
        if valor is not None and valor not in n.attrs[nombre]:
            return False
    return True


class _Constructor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.raiz = Node("#document")
        self.pila = [self.raiz]

    def handle_starttag(self, tag, attrs):
        nodo = Node(tag, {k: (v if v is not None else "") for k, v in attrs}, self.pila[-1])
        self.pila[-1].children.append(nodo)
        if tag not in VOID:
            self.pila.append(nodo)

    def handle_startendtag(self, tag, attrs):
        nodo = Node(tag, {k: (v if v is not None else "") for k, v in attrs}, self.pila[-1])
        self.pila[-1].children.append(nodo)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        # Cierre tolerante: si el tag está abierto más arriba, se cierra hasta él.
        for i in range(len(self.pila) - 1, 0, -1):
            if self.pila[i].tag == tag:
                del self.pila[i:]
                return

    def handle_data(self, data):
        self.pila[-1].children.append(data)


def parse(html_text: str) -> Node:
    c = _Constructor()
    c.feed(html_text)
    c.close()
    return c.raiz
