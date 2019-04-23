import React, { Component } from 'react'
import { Editor, getEventRange, getEventTransfer } from 'slate-react'
import { keyboardEvent } from '@slate-editor/utils'
import DeepTable from 'slate-deep-table'

import schema from '../lib/schema'
import initialValue from '!!raw-loader!../lib/value.mdx'
import { parseMDX, serializer } from '../lib/mdx-serializer'
import { isUrl, isImageUrl } from '../lib/util'

import theme from './theme'

import NodesPlugin from '../plugins/nodes'
import MarksPlugin from '../plugins/marks'
import ChecklistPlugin from '../plugins/checklist'
import CodePlugin from '../plugins/code'
import LiveJSXPlugin from '../plugins/live-jsx'
import TablePlugin from '../plugins/table'
import ImagePlugin from '../plugins/image'
import MarkdownShortcutsPlugin from '../plugins/markdown-shortcuts'
import ThemeEditorPlugin from '../plugins/theme-editor'

const plugins = [
  NodesPlugin(),
  MarksPlugin(),
  ChecklistPlugin(),
  CodePlugin(),
  LiveJSXPlugin(),
  TablePlugin(),
  DeepTable({}),
  ImagePlugin(),
  MarkdownShortcutsPlugin(),
  ThemeEditorPlugin({ theme })
]

const insertImage = (change, src, target) => {
  if (target) {
    change.select(target)
  }

  change.insertBlock({
    type: 'image',
    data: { src }
  })
}

const insertLink = (change, href, target) => {
  if (target) {
    change.select(target)
  }

  change.insertBlock({
    type: 'link',
    data: { href }
  })
}

class BlockEditor extends Component {
  constructor(props) {
    super(props)

    this.state = {
      value: serializer.deserialize(
        parseMDX(props.initialValue || initialValue)
      )
    }
  }

  emitChange = () => {
    const { value } = this.state
    this.props.onChange({ value })
  }

  // think this can be a renderEditor plugin
  handleChange = ({ value }) => {
    this.setState({ value }, this.emitChange)
  }

  handleKeyDown = (event, change, next) => {
    // Keyboard shortcuts
    if (keyboardEvent.isMod(event) && event.key === 'b') {
      return change.toggleMark('bold').focus()
    }
    if (keyboardEvent.isMod(event) && !event.shiftKey && event.key === 'i') {
      return change.toggleMark('italic').focus()
    }

    // shortcuts
    switch (event.key) {
      case '/':
        this.setState({ commandMenu: true })
        return
      case 'Escape':
        this.setState({ emojiMenu: false })
        this.setState({ menu: false })
        return
      default:
        return next()
    }
  }

  handlePaste = (event, editor, next) => {
    const { value } = editor
    const { document, startBlock } = value

    const target = getEventRange(event, editor)
    const transfer = getEventTransfer(event)
    const { type, text } = transfer

    if (type === 'text' || type === 'fragment') {
      if (isImageUrl(text)) {
        return editor.command(insertImage, text, target)
      }

      if (isUrl(text)) {
        return editor.command(insertLink, text, target)
      }

      const parent = document.getParent(startBlock.key)
      // We're inside a table and pasting a fragment, for now lets
      // not allow embedded table pasting.
      if (type === 'fragment' && parent.type === 'table_cell') {
        return editor.insertText(text || '')
      }

      return next()
    }

    next()
  }

  render() {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Editor
          ref={editor => (this.editor = editor)}
          schema={schema}
          placeholder="Write some MDX..."
          plugins={plugins}
          value={this.state.value}
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          onPaste={this.handlePaste}
          renderEditor={(_props, _editor, next) => {
            const children = next()

            return <>{children}</>
          }}
        />
      </div>
    )
  }
}

export default BlockEditor