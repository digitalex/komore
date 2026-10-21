// Every component in the Graphical library, composed with its documented Base
// UI anatomy and imported from the public entry (@graphical). Doubles as a
// usage reference and as the target for test/components.mjs, which checks the
// rendered styles against the theme's component specifications.
import { useState, type ReactNode } from "react";
import {
  Accordion, AlertDialog, Autocomplete, Avatar, Button, Checkbox, CheckboxGroup, Collapsible,
  Combobox, ComboboxField, ContextMenu, Dialog, Drawer, Field, Fieldset, Form, Input, InputLabel,
  Menu, Menubar, Meter, NavigationMenu, NumberField, OTPField, Popover, PreviewCard, Progress,
  Radio, RadioGroup, ScrollArea, Select, SelectField, Separator, Slider, Switch, Tabs, ThemedIcon,
  Toast, Toggle, ToggleGroup, Toolbar, Tooltip, themeDisplay,
} from "./exports.ts";
import { useNotify } from "../theme/ThemeRoot.tsx";

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="gallery-card" data-gallery={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const FRUITS = ["Apple", "Banana", "Cherry", "Grape", "Mango"];

export function Gallery() {
  const notify = useNotify();
  const [checked, setChecked] = useState<string[]>(["email"]);
  return (
    <main className="gallery">
      <h1 className="page-title">{themeDisplay} components</h1>
      <div className="gallery-grid">
        <Card id="button" title="Button">
          <div className="gallery-row">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </Card>

        <Card id="input" title="Text field">
          <InputLabel htmlFor="g-input">Email</InputLabel>
          <Input id="g-input" placeholder="you@example.com" />
        </Card>

        <Card id="field" title="Field">
          <Field.Root>
            <Field.Label>Username</Field.Label>
            <Field.Control placeholder="ada" required />
            <Field.Description>Visible to everyone in the document.</Field.Description>
            <Field.Error match="valueMissing">Pick a username.</Field.Error>
          </Field.Root>
        </Card>

        <Card id="fieldset" title="Fieldset">
          <Fieldset.Root>
            <Fieldset.Legend>Billing</Fieldset.Legend>
            <Fieldset.Content>
              <Field.Root>
                <Fieldset.Label>Company</Fieldset.Label>
                <Fieldset.Control placeholder="Komore Inc." />
                <Fieldset.Description>Shown on invoices.</Fieldset.Description>
              </Field.Root>
            </Fieldset.Content>
          </Fieldset.Root>
        </Card>

        <Card id="form" title="Form">
          <Form onSubmit={(e) => (e.preventDefault(), notify("Form submitted"))}>
            <Form.Content>
              <Field.Root name="title">
                <Form.Label>Title</Form.Label>
                <Form.Control required placeholder="Launch plan" />
                <Form.Error match="valueMissing">Give it a title.</Form.Error>
              </Field.Root>
              <Form.Action type="submit">Save</Form.Action>
            </Form.Content>
          </Form>
        </Card>

        <Card id="checkbox" title="Checkbox">
          <Checkbox.Row>
            <Checkbox.Root defaultChecked>
              <Checkbox.Indicator />
            </Checkbox.Root>
            <Checkbox.Label>Notify me</Checkbox.Label>
          </Checkbox.Row>
        </Card>

        <Card id="checkbox-group" title="Checkbox group">
          <CheckboxGroup value={checked} onValueChange={setChecked} aria-label="Notifications">
            {["email", "push", "sms"].map((v) => (
              <CheckboxGroup.Row key={v}>
                <Checkbox.Root value={v}>
                  <Checkbox.Indicator />
                </Checkbox.Root>
                <CheckboxGroup.Label>{v}</CheckboxGroup.Label>
              </CheckboxGroup.Row>
            ))}
          </CheckboxGroup>
        </Card>

        <Card id="switch" title="Switch">
          <Switch.Row>
            <Switch.Root defaultChecked>
              <Switch.Thumb />
            </Switch.Root>
            <Switch.Label>Live cursors</Switch.Label>
          </Switch.Row>
        </Card>

        <Card id="radio" title="Radio">
          <RadioGroup defaultValue="a" aria-label="Plan">
            <Radio.Row>
              <Radio.Root value="a">
                <Radio.Indicator />
              </Radio.Root>
              <Radio.Label>Single</Radio.Label>
            </Radio.Row>
          </RadioGroup>
        </Card>

        <Card id="radio-group" title="Radio group">
          <RadioGroup defaultValue="team" aria-label="Plan">
            {["solo", "team", "org"].map((v) => (
              <RadioGroup.Row key={v}>
                <Radio.Root value={v}>
                  <Radio.Indicator />
                </Radio.Root>
                <RadioGroup.Label>{v}</RadioGroup.Label>
              </RadioGroup.Row>
            ))}
          </RadioGroup>
        </Card>

        <Card id="select" title="Select">
          <SelectField label="Font" defaultValue="sans" options={[{ value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }, { value: "mono", label: "Mono" }]} />
          <Select.Root defaultValue="m" items={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }]}>
            <Select.Label>Size</Select.Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.List>
                    {[["s", "Small"], ["m", "Medium"]].map(([v, l]) => (
                      <Select.Item key={v} value={v}>
                        <Select.ItemText>{l}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </Card>

        <Card id="combobox" title="Combobox">
          <ComboboxField label="Fruit" items={FRUITS} placeholder="Pick a fruit" />
        </Card>

        <Card id="autocomplete" title="Autocomplete">
          <Autocomplete.Root items={FRUITS}>
            <Autocomplete.Label htmlFor="g-ac">Search fruit</Autocomplete.Label>
            <Autocomplete.Input id="g-ac" placeholder="Type to search" />
            <Autocomplete.Portal>
              <Autocomplete.Positioner>
                <Autocomplete.Popup>
                  <Autocomplete.Empty>No fruit found.</Autocomplete.Empty>
                  <Autocomplete.List>
                    {(item: string) => (
                      <Autocomplete.Item key={item} value={item}>
                        {item}
                      </Autocomplete.Item>
                    )}
                  </Autocomplete.List>
                </Autocomplete.Popup>
              </Autocomplete.Positioner>
            </Autocomplete.Portal>
          </Autocomplete.Root>
        </Card>

        <Card id="number-field" title="Number field">
          <NumberField.Root defaultValue={3} min={0}>
            <NumberField.Label>Copies</NumberField.Label>
            <NumberField.Group>
              <NumberField.Decrement aria-label="Fewer">
                <ThemedIcon name="minus" semantic />
              </NumberField.Decrement>
              <NumberField.Input />
              <NumberField.Increment aria-label="More">
                <ThemedIcon name="plus" semantic />
              </NumberField.Increment>
            </NumberField.Group>
          </NumberField.Root>
        </Card>

        <Card id="otp-field" title="OTP field">
          <OTPField.Root length={4} aria-label="Code">
            <OTPField.Label>Code</OTPField.Label>
            {[0, 1].map((i) => (
              <OTPField.Input key={i} />
            ))}
            <OTPField.Separator />
            {[2, 3].map((i) => (
              <OTPField.Input key={i} />
            ))}
          </OTPField.Root>
        </Card>

        <Card id="slider" title="Slider">
          <Slider.Root defaultValue={40}>
            <Slider.Heading>
              <Slider.Label>Volume</Slider.Label>
              <Slider.Value />
            </Slider.Heading>
            <Slider.Control>
              <Slider.Track>
                <Slider.Indicator />
                <Slider.Thumb aria-label="Volume" />
              </Slider.Track>
            </Slider.Control>
          </Slider.Root>
        </Card>

        <Card id="meter" title="Meter">
          <Meter.Root value={62}>
            <Meter.Heading>
              <Meter.Label>Storage</Meter.Label>
              <Meter.Value />
            </Meter.Heading>
            <Meter.Track>
              <Meter.Indicator />
            </Meter.Track>
          </Meter.Root>
        </Card>

        <Card id="progress" title="Progress">
          <Progress.Root value={35}>
            <Progress.Heading>
              <Progress.Label>Uploading</Progress.Label>
              <Progress.Value />
            </Progress.Heading>
            <Progress.Track>
              <Progress.Indicator />
            </Progress.Track>
          </Progress.Root>
        </Card>

        <Card id="toggle" title="Toggle">
          <div className="gallery-row">
            <Toggle aria-label="Bold" defaultPressed>
              <ThemedIcon name="bold" semantic />
            </Toggle>
            <Toggle>
              <Toggle.Label>Comments</Toggle.Label>
            </Toggle>
          </div>
        </Card>

        <Card id="toggle-group" title="Toggle group">
          <ToggleGroup defaultValue={["left"]} aria-label="Alignment">
            {["left", "center", "right"].map((v) => (
              <Toggle key={v} value={v}>
                <ToggleGroup.Label>{v}</ToggleGroup.Label>
              </Toggle>
            ))}
          </ToggleGroup>
        </Card>

        <Card id="toolbar" title="Toolbar">
          <Toolbar.Root aria-label="Formatting">
            <Toolbar.Button aria-label="Undo" className="ui-toolbar-icon">
              <ThemedIcon name="undo" semantic />
            </Toolbar.Button>
            <Toolbar.Separator />
            <Toolbar.Button>
              <Toolbar.Label>Comment</Toolbar.Label>
            </Toolbar.Button>
            <Toolbar.Link href="#toolbar">Help</Toolbar.Link>
          </Toolbar.Root>
        </Card>

        <Card id="separator" title="Separator">
          <span className="body-text">Above</span>
          <Separator />
          <span className="body-text">Below</span>
        </Card>

        <Card id="avatar" title="Avatar">
          <div className="gallery-row">
            <Avatar.Root>
              <Avatar.Fallback>AL</Avatar.Fallback>
            </Avatar.Root>
            <Avatar.Root>
              <Avatar.Image src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" alt="" />
              <Avatar.Fallback>SB</Avatar.Fallback>
            </Avatar.Root>
          </div>
        </Card>

        <Card id="tabs" title="Tabs">
          <Tabs.Root defaultValue="edits">
            <Tabs.List>
              <Tabs.Tab value="edits">Edits</Tabs.Tab>
              <Tabs.Tab value="comments">Comments</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="edits">
              <Tabs.Content>Recent edits by everyone.</Tabs.Content>
            </Tabs.Panel>
            <Tabs.Panel value="comments">
              <Tabs.Content>Open threads.</Tabs.Content>
            </Tabs.Panel>
          </Tabs.Root>
        </Card>

        <Card id="accordion" title="Accordion">
          <Accordion.Root defaultValue={["what"]}>
            <Accordion.Item value="what">
              <Accordion.Header>
                <Accordion.Trigger>
                  What is Komore?
                  <Accordion.Indicator>
                    <ThemedIcon name="chevronRight" semantic />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>
                <Accordion.Content>Documents for people and agents.</Accordion.Content>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="how">
              <Accordion.Header>
                <Accordion.Trigger>
                  How do agents join?
                  <Accordion.Indicator>
                    <ThemedIcon name="chevronRight" semantic />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>
                <Accordion.Content>With the komore CLI.</Accordion.Content>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        </Card>

        <Card id="collapsible" title="Collapsible">
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>
              Details
              <Collapsible.Indicator>
                <ThemedIcon name="chevronRight" semantic />
              </Collapsible.Indicator>
            </Collapsible.Trigger>
            <Collapsible.Panel>
              <Collapsible.Content>Hidden details, now shown.</Collapsible.Content>
            </Collapsible.Panel>
          </Collapsible.Root>
        </Card>

        <Card id="scroll-area" title="Scroll area">
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <ScrollArea.Content>
                {Array.from({ length: 20 }, (_, i) => (
                  <p key={i}>Line {i + 1} of a long list.</p>
                ))}
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical">
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Card>

        <Card id="tooltip" title="Tooltip">
          <Tooltip.Root>
            <Tooltip.Trigger>Hover me</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={8}>
                <Tooltip.Popup>Tooltips add a short explanation.</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Card>

        <Card id="popover" title="Popover">
          <Popover.Root>
            <Popover.Trigger>Open popover</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8}>
                <Popover.Popup>
                  <Popover.Title>Share</Popover.Title>
                  <Popover.Description>Anyone with the link can edit.</Popover.Description>
                  <Popover.Close>Done</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </Card>

        <Card id="preview-card" title="Preview card">
          <PreviewCard.Root>
            <PreviewCard.Trigger href="#preview-card">Launch plan</PreviewCard.Trigger>
            <PreviewCard.Portal>
              <PreviewCard.Positioner sideOffset={8}>
                <PreviewCard.Popup>
                  <PreviewCard.Title>Launch plan</PreviewCard.Title>
                  <PreviewCard.Description>Edited by Ada and Sable.</PreviewCard.Description>
                </PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </PreviewCard.Root>
        </Card>

        <Card id="menu" title="Menu">
          <Menu.Root>
            <Menu.Trigger>Actions</Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={8}>
                <Menu.Popup>
                  <Menu.Group>
                    <Menu.GroupLabel>Document</Menu.GroupLabel>
                    <Menu.Item>
                      <Menu.ItemContent icon={<ThemedIcon name="copy" semantic />} shortcut="⌘C">
                        Copy link
                      </Menu.ItemContent>
                    </Menu.Item>
                  </Menu.Group>
                  <Menu.Separator />
                  <Menu.CheckboxItem defaultChecked>
                    <Menu.ItemContent icon={<Menu.CheckboxItemIndicator><ThemedIcon name="check" semantic /></Menu.CheckboxItemIndicator>}>
                      Show cursors
                    </Menu.ItemContent>
                  </Menu.CheckboxItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Card>

        <Card id="context-menu" title="Context menu">
          <ContextMenu.Root>
            <ContextMenu.Trigger>Right-click here</ContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Positioner>
                <ContextMenu.Popup>
                  <ContextMenu.Group>
                    <ContextMenu.GroupLabel>Text</ContextMenu.GroupLabel>
                    <ContextMenu.Item>Comment</ContextMenu.Item>
                  </ContextMenu.Group>
                  <ContextMenu.Separator />
                  <ContextMenu.Item>Copy as Markdown</ContextMenu.Item>
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        </Card>

        <Card id="menubar" title="Menubar">
          <Menubar>
            {["File", "Edit"].map((label) => (
              <Menu.Root key={label}>
                <Menubar.Trigger>{label}</Menubar.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={8}>
                    <Menu.Popup>
                      <Menu.Item>New</Menu.Item>
                      <Menu.Item>Open</Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            ))}
          </Menubar>
        </Card>

        <Card id="navigation-menu" title="Navigation menu">
          <NavigationMenu.Root>
            <NavigationMenu.List>
              <NavigationMenu.Item>
                <NavigationMenu.Trigger>Docs</NavigationMenu.Trigger>
                <NavigationMenu.Content>
                  <NavigationMenu.Link href="#navigation-menu">Getting started</NavigationMenu.Link>
                  <NavigationMenu.Link href="#navigation-menu">Agents</NavigationMenu.Link>
                </NavigationMenu.Content>
              </NavigationMenu.Item>
              <NavigationMenu.Item>
                <NavigationMenu.Link href="#navigation-menu">Pricing</NavigationMenu.Link>
              </NavigationMenu.Item>
            </NavigationMenu.List>
            <NavigationMenu.Portal>
              <NavigationMenu.Positioner sideOffset={8}>
                <NavigationMenu.Popup>
                  <NavigationMenu.Viewport />
                </NavigationMenu.Popup>
              </NavigationMenu.Positioner>
            </NavigationMenu.Portal>
          </NavigationMenu.Root>
        </Card>

        <Card id="dialog" title="Dialog">
          <Dialog.Root>
            <Dialog.Trigger>Open dialog</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Popup>
                <Dialog.Title>Rename document</Dialog.Title>
                <Dialog.Description>Everyone sees the new name right away.</Dialog.Description>
                <div className="dialog-actions">
                  <Dialog.Close>Cancel</Dialog.Close>
                  <Dialog.Action>Rename</Dialog.Action>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </Card>

        <Card id="alert-dialog" title="Alert dialog">
          <AlertDialog.Root>
            <AlertDialog.Trigger>Delete…</AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Backdrop />
              <AlertDialog.Popup>
                <AlertDialog.Title>Delete this thread?</AlertDialog.Title>
                <AlertDialog.Description>This can't be undone.</AlertDialog.Description>
                <div className="dialog-actions">
                  <AlertDialog.Close>Cancel</AlertDialog.Close>
                  <AlertDialog.Action>Delete</AlertDialog.Action>
                </div>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </Card>

        <Card id="drawer" title="Drawer">
          <Drawer.Root>
            <Drawer.Trigger>Open drawer</Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Backdrop />
              <Drawer.Viewport>
                <Drawer.Popup>
                  <Drawer.Content>
                    <Drawer.Title>Version history</Drawer.Title>
                    <Drawer.Description>Every change, by everyone.</Drawer.Description>
                    <div className="dialog-actions">
                      <Drawer.Close>Close</Drawer.Close>
                      <Drawer.Action>Restore</Drawer.Action>
                    </div>
                  </Drawer.Content>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>
        </Card>

        <Card id="toast" title="Toast">
          <Toast.Trigger onClick={() => notify("Link copied", "Anyone with it can edit.")}>Show toast</Toast.Trigger>
        </Card>
      </div>
    </main>
  );
}
