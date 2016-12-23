import Projector from './../Projector';
import Button from './../components/button/Button';
import TextInput from './../components/textinput/TextInput';
import { w } from './../d';

const projector = new Projector({});

projector.children = [
	w(Button, { listeners: { onclick: () => { console.log('click'); }}}),
	w(TextInput, { listeners: { onkeypress: function (this: TextInput) { console.log(this.state.value); }}})
];

projector.append().then(() => {
	console.log('I am appended');
});
