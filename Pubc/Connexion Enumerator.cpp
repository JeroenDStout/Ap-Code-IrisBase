/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"
#include "BlackRoot/Pubc/Threaded IO Stream.h"

#include "BlackRoot/Pubc/Files.h"

#include "IrisBase/Pubc/Connexion Enumerator.h"

using namespace IrisBack::Connexion;

    //  Control
    // --------------------

void ConnexionEnumerator::add_from_directory(Path path)
{
	using JSON = BlackRoot::Format::JSON;

	BlackRoot::IO::BaseFileSource src;

	DbAssertFatal(src.DirectoryExists(path));

	auto cont = src.GetDirectoryContents(path);
	for (auto & elem : cont) {
		if (!elem.Is_File)
			continue;
		
		try {
			std::string content = src.ReadFileAsString(elem.Path, BlackRoot::IO::IFileSource::OpenInstr{}.DefaultRead());
			auto json = JSON::parse(content);

			KnownConnexion kn;
			kn.Name	= json["name"].get<std::string>();
			kn.Port	= json["port"].get<uint32>();
			kn.Icon	= json["icon"].get<std::string>();

			this->Known_Connexions.push_back(kn);
		}
		catch (std::exception e) {
			throw new BlackRoot::Debug::Exception((std::stringstream{} << "Error reading '" << elem.Path.string() << "': " << e.what()).str(), BRGenDbgInfo);
		}
		catch (BlackRoot::Debug::Exception * e) {
			throw new BlackRoot::Debug::Exception((std::stringstream{} << "Error reading '" << elem.Path.string() << "'").str(), e, BRGenDbgInfo);
		}
		catch (...) {
			throw new BlackRoot::Debug::Exception((std::stringstream{} << "Unknown error reading '" << elem.Path.string() << "'").str(), BRGenDbgInfo);
		}
	}
}

void ConnexionEnumerator::remove_all()
{
	this->Known_Connexions.clear();
}

    //  Util
    // --------------------

const KnownConnexionList & ConnexionEnumerator::get_connexions() const
{
	return this->Known_Connexions;
}